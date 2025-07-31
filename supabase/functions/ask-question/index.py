# supabase/functions/ask-question/index.py
import os
import supabase
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from flask import jsonify # Supabase uses Flask's jsonify for responses

def handler(request):
    body = request.get_json()
    user_question = body.get('question')
    if not user_question:
        return jsonify({"error": "No question provided"}), 400

    try:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_ANON_KEY")
        google_api_key = os.environ.get("GOOGLE_API_KEY")

        supabase_client = supabase.create_client(url, key)
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=google_api_key)
        question_embedding = embeddings.embed_query(user_question)

        match_response = supabase_client.rpc('match_documents', {
            'query_embedding': question_embedding,
            'match_threshold': 0.75,
            'match_count': 5
        }).execute()

        context_text = ""
        if match_response.data:
            for item in match_response.data:
                context_text += item['content'] + "\n---\n"

        if not context_text:
            return jsonify({"answer": "I could not find relevant information to answer your question."})

        prompt_template = """Answer the question based only on the context.
        Context: {context}
        Question: {question}
        Answer:"""

        PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
        llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", temperature=0.3, google_api_key=google_api_key)
        chain = LLMChain(llm=llm, prompt=PROMPT)
        answer = chain.run(context=context_text, question=user_question)

        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500