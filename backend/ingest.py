import os
# Removed dotenv import - environment variables will be managed by the server (Render)
# from dotenv import load_dotenv

from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma

# NOTE: No need to call load_dotenv(). On Render, environment variables are
# set in the dashboard. For local development, you can set them in your terminal.

# --- Configuration ---
# Directory where your personal documents are stored. This path is relative
# to the script's location, which is correct for our project structure.
DOCUMENTS_DIR = "./documents"

# The directory for the ChromaDB vector store.
# IMPORTANT: This now checks for a 'CHROMA_PERSIST_DIR' environment variable.
# - On Render, we will set this to '/var/data/chroma_db' to use the persistent disk.
# - When running locally, it will default to './chroma_db'.
PERSIST_DIRECTORY = os.getenv('CHROMA_PERSIST_DIR', './chroma_db')


def ingest_documents():
    """
    Loads documents from the specified directory, splits them,
    creates embeddings using GoogleGenerativeAIEmbeddings,
    and stores them in a ChromaDB vector store in the persistent directory.
    """
    print(f"--- Starting Document Ingestion from '{DOCUMENTS_DIR}' ---")
    print(f"--- VectorDB will be persisted to '{PERSIST_DIRECTORY}' ---")

    documents = []
    # Loop through all files in the documents directory
    for filename in os.listdir(DOCUMENTS_DIR):
        filepath = os.path.join(DOCUMENTS_DIR, filename)
        if os.path.isfile(filepath):
            if filename.endswith(".txt"):
                print(f"Loading text file: {filename}")
                loader = TextLoader(filepath, encoding='utf-8')
                documents.extend(loader.load())
            elif filename.endswith(".pdf"):
                print(f"Loading PDF file: {filename}")
                loader = PyPDFLoader(filepath)
                documents.extend(loader.load())
            else:
                print(f"Skipping unsupported file type: {filename}")

    if not documents:
        print(f"No documents found in '{DOCUMENTS_DIR}'. Please add your text or PDF files.")
        return

    print(f"Loaded {len(documents)} document(s).")

    # Split documents into smaller chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    texts = text_splitter.split_documents(documents)
    print(f"Split documents into {len(texts)} text chunks.")

    # Initialize GoogleGenerativeAIEmbeddings
    print("Initializing Google Generative AI Embeddings...")
    try:
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not found. Please set it.")

        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=google_api_key)
        print("Embeddings model initialized.")

        # Create and persist the ChromaDB vector store
        print(f"Creating/Updating ChromaDB at '{PERSIST_DIRECTORY}'...")
        
        # This logic correctly handles creating a new DB or adding to an existing one.
        # When run on the Render shell, it will create the DB on the persistent disk.
        if os.path.exists(PERSIST_DIRECTORY) and os.listdir(PERSIST_DIRECTORY):
            print("Loading existing ChromaDB and adding new documents...")
            vectordb = Chroma(persist_directory=PERSIST_DIRECTORY, embedding_function=embeddings)
            vectordb.add_documents(texts)
        else:
            print("Creating new ChromaDB...")
            vectordb = Chroma.from_documents(
                documents=texts,
                embedding=embeddings,
                persist_directory=PERSIST_DIRECTORY
            )
        
        vectordb.persist() # Ensure the database is saved to disk
        print("ChromaDB ingestion complete and persisted!")

    except Exception as e:
        print(f"An error occurred: {e}")
        print("Please ensure your GOOGLE_API_KEY is correctly set in the environment variables and has access to the Gemini API.")


if __name__ == "__main__":
    ingest_documents()
