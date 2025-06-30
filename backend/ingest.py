# backend/ingest.py
import os
import shutil
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma

def ingest_documents():
    """
    Loads all documents from the source directory, creates embeddings,
    and saves them to the vector store.
    """
    DOCUMENTS_DIR = "./documents"
    CHROMA_DB_DIR = "./chroma_db"

    if not os.path.exists(DOCUMENTS_DIR) or not os.listdir(DOCUMENTS_DIR):
        print(f"No documents found in '{DOCUMENTS_DIR}'. Skipping ingestion.")
        return

    print(f"--- Starting document ingestion from '{DOCUMENTS_DIR}' ---")
    
    documents = []
    for filename in os.listdir(DOCUMENTS_DIR):
        filepath = os.path.join(DOCUMENTS_DIR, filename)
        if os.path.isfile(filepath) and filename.endswith(".pdf"):
            try:
                print(f"Loading PDF file: {filename}")
                loader = PyPDFLoader(filepath)
                documents.extend(loader.load())
            except Exception as e:
                print(f"Error loading {filename}: {e}")

    if not documents:
        print("Could not load any documents. Ingestion stopped.")
        return

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    texts = text_splitter.split_documents(documents)
    
    print("Initializing Google Generative AI Embeddings...")
    try:
        google_api_key = os.getenv("GOOGLE_API_KEY")
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=google_api_key)
        
        print(f"Creating/updating ChromaDB at '{CHROMA_DB_DIR}'...")
        Chroma.from_documents(
            documents=texts,
            embedding=embeddings,
            persist_directory=CHROMA_DB_DIR
        )
        print("--- ChromaDB ingestion complete. ---")

    except Exception as e:
        print(f"An error occurred during embedding or DB creation: {e}")

# ... (rest of the file remains the same)