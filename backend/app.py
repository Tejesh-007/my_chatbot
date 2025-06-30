# backend/app.py
import os
import shutil
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# Import the ingestion function
from ingest import ingest_documents

# Load environment variables from .env file
load_dotenv()

# --- Create the Flask App Instance ---
app = Flask(__name__)
CORS(app)

# --- Configuration ---
UPLOAD_FOLDER = './documents'
ALLOWED_EXTENSIONS = {'pdf'}
CHROMA_DB_DIR = "./chroma_db"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Global variables
qa_chain = None
vectordb = None

# --- Helper Functions ---

def allowed_file(filename):
    """Checks if a file's extension is in the ALLOWED_EXTENSIONS set."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def clear_database_connection():
    """
    Resets the ChromaDB via its API and clears the global variables.
    This is used for "hot reloads" when uploading/removing files while the app is running.
    """
    global qa_chain, vectordb
    if vectordb:
        print("--- Attempting to reset ChromaDB... ---")
        try:
            vectordb._client.reset()
            print("--- ChromaDB has been reset successfully. ---")
        except Exception as e:
            print(f"An error occurred while resetting ChromaDB: {e}")

    # Clear the in-memory variables
    qa_chain = None
    vectordb = None
    import gc
    gc.collect()
    print("--- In-memory variables cleared. ---")

def initialize_chatbot():
    """Initializes or re-initializes the chatbot's RAG chain."""
    global qa_chain, vectordb
    print("--- Attempting to initialize chatbot... ---")
    try:
        # Step 1: Ingest documents into the database.
        # This will create a new DB if one doesn't exist.
        ingest_documents()

        # Step 2: Check if the database is usable after ingestion
        if not os.path.exists(CHROMA_DB_DIR) or not os.listdir(CHROMA_DB_DIR):
            print("ChromaDB not found or empty after ingestion. Chatbot will not be active.")
            qa_chain = None
            return
        
        # Step 3: Load the necessary components
        print(f"Loading ChromaDB from '{CHROMA_DB_DIR}'...")
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY not found. Please set it in your .env file.")

        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=google_api_key)
        vectordb = Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=embeddings)
        
        llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", temperature=0.3, google_api_key=google_api_key)
        
        prompt_template = """You are a helpful Q&A assistant.
        Answer the question truthfully and concisely based *only* on the provided context.
        If the answer is not in the context, say "I don't have information about that in the documents."

        Context:
        {context}

        Question: {question}
        Answer:"""
        PROMPT = PromptTemplate(
            template=prompt_template, input_variables=["context", "question"]
        )

        # Step 4: Create the RetrievalQA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vectordb.as_retriever(search_kwargs={"k": 3}),
            return_source_documents=False,
            chain_type_kwargs={"prompt": PROMPT}
        )
        print("--- Chatbot Initialized Successfully! ---")

    except Exception as e:
        print(f"FATAL: An error occurred during chatbot initialization: {e}")
        qa_chain = None

# --- API Routes ---

@app.route('/upload', methods=['POST'])
def upload_file_route():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            file.save(filepath)
            print(f"File '{filename}' saved successfully.")
            
            clear_database_connection()
            initialize_chatbot()
            
            return jsonify({"message": f"File '{filename}' uploaded and processed successfully."}), 200
        
        except Exception as e:
            print(f"Error during file processing: {e}")
            return jsonify({"error": f"An error occurred while processing the file: {e}"}), 500
    else:
        return jsonify({"error": "File type not allowed. Please upload a PDF."}), 400

@app.route('/remove', methods=['POST'])
def remove_file_route():
    data = request.json
    filename = data.get('filename')
    if not filename:
        return jsonify({"error": "No filename provided."}), 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(filename))

    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            print(f"File '{filename}' removed successfully.")

            clear_database_connection()
            initialize_chatbot()
            
            return jsonify({"message": f"File '{filename}' has been removed successfully."}), 200
        except Exception as e:
            print(f"Error removing file or re-initializing: {e}")
            return jsonify({"error": "An error occurred while removing the file."}), 500
    else:
        return jsonify({"error": "File not found."}), 404

@app.route('/ask', methods=['POST'])
def ask_question():
    if qa_chain is None:
        return jsonify({"answer": "The chatbot is not ready. Please upload a document to begin."})

    data = request.json
    question = data.get('question')
    if not question:
        return jsonify({"error": "No question provided."}), 400

    try:
        result = qa_chain.invoke({"query": question})
        answer = result.get('result', "I couldn't find an answer in the documents.")
        return jsonify({"answer": answer})
    except Exception as e:
        print(f"Error during question processing: {e}")
        return jsonify({"error": "An error occurred while answering the question."}), 500

# --- Initial Startup ---
with app.app_context():
    # On startup, always delete the old database to ensure a clean state
    # that reflects the current content of the 'documents' folder.
    if os.path.exists(CHROMA_DB_DIR):
        print(f"--- Found old database. Removing '{CHROMA_DB_DIR}' for a clean start... ---")
        shutil.rmtree(CHROMA_DB_DIR)
    
    # Now initialize, which will build a fresh database.
    initialize_chatbot()

if __name__ == '__main__':
    # Run the app with debug mode on, but the reloader off to prevent file-locking race conditions.
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
