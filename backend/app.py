import os
# Removed dotenv import - environment variables will be managed by the server (Render)
from flask import Flask, request, jsonify
from flask_cors import CORS

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# NOTE: No need to call load_dotenv(). On Render, environment variables are
# set in the dashboard.

app = Flask(__name__)
# Enable CORS for all routes. This is crucial for allowing your Next.js frontend
# to communicate with this Flask backend.
CORS(app)

# --- Configuration ---
# The directory for the ChromaDB vector store.
# IMPORTANT: This now checks for a 'CHROMA_PERSIST_DIR' environment variable.
# - On Render, we will set this to '/var/data/chroma_db' to use the persistent disk.
# - When running locally, it will default to './chroma_db'.
PERSIST_DIRECTORY = os.getenv('CHROMA_PERSIST_DIR', './chroma_db')

# --- Initialize LLM and Vector Store (Load once when app starts) ---
qa_chain = None

def initialize_chatbot():
    """Initializes the chatbot's LLM, embeddings, and RAG chain."""
    global qa_chain

    if qa_chain is not None:
        print("Chatbot already initialized.")
        return

    print("--- Initializing Chatbot Components ---")
    try:
        # Check for Google API Key from environment variables
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not found. Please set it.")
        print("Google API Key loaded successfully.")

        # Initialize Google Generative AI Embeddings
        print("Initializing Google Generative AI Embeddings...")
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=google_api_key)

        # Load the persisted ChromaDB vector store from the dynamic path
        print(f"Loading ChromaDB from '{PERSIST_DIRECTORY}'...")
        if not os.path.exists(PERSIST_DIRECTORY) or not os.listdir(PERSIST_DIRECTORY):
            raise FileNotFoundError(
                f"ChromaDB not found at '{PERSIST_DIRECTORY}'. "
                f"Please run the ingestion script on the server shell first."
            )

        vectordb = Chroma(persist_directory=PERSIST_DIRECTORY, embedding_function=embeddings)
        print("ChromaDB loaded successfully.")

        # Initialize Google Generative AI Chat Model (Gemini)
        print("Initializing Google Generative AI Chat Model (gemini-1.5-flash)...")
        llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", temperature=0.2, google_api_key=google_api_key)

        # Define the prompt template for Retrieval-Augmented Generation (RAG)
        prompt_template = """You are a helpful Q&A assistant.
        Answer the question truthfully and concisely based *only* on the following context.
        If the answer cannot be found in the context, please state that you don't have enough information.

        Context:
        {context}

        Question: {question}

        Answer:"""
        PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])

        # Create the RetrievalQA chain
        print("Creating RetrievalQA chain...")
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vectordb.as_retriever(search_kwargs={"k": 3}),
            return_source_documents=False,
            chain_type_kwargs={"prompt": PROMPT}
        )
        print("--- Chatbot Initialized Successfully! ---")

    except Exception as e:
        print(f"FATAL: Error initializing chatbot: {e}")
        qa_chain = None


# Call initialization function when the app starts.
# Using with app.app_context() ensures it runs correctly in the Flask application context.
with app.app_context():
    initialize_chatbot()

# --- API Routes ---
@app.route('/ask', methods=['POST'])
def ask_question():
    """API endpoint to receive a question and return a Gemini-generated answer."""
    if qa_chain is None:
        return jsonify({"error": "Chatbot is not initialized. Check server logs for errors."}), 500

    data = request.json
    question = data.get('question')

    if not question:
        return jsonify({"error": "No question provided in the request body."}), 400

    print(f"Received question: '{question}'")
    try:
        # Invoke the RAG chain with the user's question
        result = qa_chain.invoke({"query": question}) # Use .invoke for newer langchain versions
        answer = result.get('result', "I'm sorry, I couldn't find an answer based on the provided documents.")
        print(f"Generated answer: '{answer}'")
        return jsonify({"answer": answer})
    except Exception as e:
        print(f"Error processing question: {e}")
        return jsonify({"error": "An error occurred while processing your question."}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint to verify the service is up and if the chatbot is ready."""
    return jsonify({"status": "ok", "chatbot_initialized": qa_chain is not None}), 200

if __name__ == '__main__':
    # This block is for local development.
    # On Render, a production WSGI server like Gunicorn will be used to run the app.
    app.run(debug=True, host='0.0.0.0', port=5000)
