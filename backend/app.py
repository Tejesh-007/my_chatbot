# app.py
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# --- NEW: Import the ingestion function ---
from ingest import ingest_documents

app = Flask(__name__)
CORS(app)

PERSIST_DIRECTORY = "./chroma_db"
qa_chain = None

# --- NEW: Self-contained startup sequence ---
# This block now runs when the application container starts.
print("--- KICKING OFF APPLICATION STARTUP ---")

# Step 1: Ingest documents from the./documents folder.
# This creates/updates the chroma_db on the server's temporary disk.
ingest_documents()

def initialize_chatbot():
    """Initializes the chatbot's LLM, embeddings, and RAG chain."""
    global qa_chain

    if qa_chain is not None:
        print("Chatbot already initialized.")
        return

    print("--- Initializing Chatbot Components ---")
    try:
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not found.")
        print("Google API Key loaded successfully.")

        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=google_api_key)

        print(f"Loading ChromaDB from '{PERSIST_DIRECTORY}'...")
        if not os.path.exists(PERSIST_DIRECTORY):
             raise FileNotFoundError(f"ChromaDB not found. Ingestion may have failed.")

        vectordb = Chroma(persist_directory=PERSIST_DIRECTORY, embedding_function=embeddings)
        print("ChromaDB loaded successfully.")

        llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", temperature=0.2, google_api_key=google_api_key)

        prompt_template = """You are a helpful Q&A assistant.
        Answer the question truthfully and concisely based *only* on the following context.
        If the answer cannot be found in the context, please state that you don't have enough information.

        Context:
        {context}

        Question: {question}

        Answer:"""
        PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])

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

# Step 2: Initialize the chatbot with the data we just ingested.
with app.app_context():
    initialize_chatbot()

# --- API Routes ---
@app.route('/ask', methods=)
def ask_question():
    if qa_chain is None:
        return jsonify({"error": "Chatbot is not initialized. Check server logs."}), 500
    data = request.json
    question = data.get('question')
    if not question:
        return jsonify({"error": "No question provided."}), 400
    try:
        result = qa_chain.invoke({"query": question})
        answer = result.get('result', "I'm sorry, I couldn't find an answer.")
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=)
def health_check():
    return jsonify({"status": "ok", "chatbot_initialized": qa_chain is not None}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)