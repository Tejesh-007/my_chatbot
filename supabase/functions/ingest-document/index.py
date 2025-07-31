# supabase/functions/ingest-document/index.py
import os
import tempfile
import supabase
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings

def handler(request):
    try:
        url = os.environ.get("SUPABASE_URL")
        # This function needs admin rights, so we use a custom secret
        key = os.environ.get("CUSTOM_SUPABASE_SERVICE_KEY")
        google_api_key = os.environ.get("GOOGLE_API_KEY")

        supabase_client = supabase.create_client(url, key)
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=google_api_key)

        record = request.get_json()
        bucket_name = record.get('bucket_id')
        file_path = record.get('path')

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            res = supabase_client.storage.from_(bucket_name).download(file_path)
            temp_file.write(res)
            temp_file_path = temp_file.name

        loader = PyPDFLoader(temp_file_path)
        documents = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(documents)

        data_to_insert = []
        for chunk in chunks:
            content = chunk.page_content
            content_embedding = embeddings.embed_query(content)
            data_to_insert.append({'content': content, 'embedding': content_embedding})

        if data_to_insert:
            supabase_client.table('documents').insert(data_to_insert).execute()

        os.remove(temp_file_path)
        return {"status": "success", "message": f"Processed {file_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500