import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.question_answering import load_qa_chain
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_ollama import OllamaEmbeddings
from langchain_cerebras import ChatCerebras
import streamlit as st

# === CONFIGURATION ===
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY

INDEX_NAME = "hackdavis-rag-index"
EMBEDDING_DIM = 768

# === LOAD AND PROCESS PDF ===
def load_and_split_pdf(pdf_path):
    loader = PyPDFLoader(pdf_path)
    data = loader.load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
    print("loaded pdf and split text")
    return splitter.split_documents(data)

# === UPLOAD VECTORS TO PINECONE ===
def upload_vectors(texts, embeddings, index_name):
    vector_store = PineconeVectorStore(index_name=index_name, embedding=embeddings)
    for t in texts:
        vector_store.add_texts([t.page_content])
    print("uploaded vectors to pinecone")
    return vector_store

# === INITIALIZE PINECONE INDEX ===
def init_pinecone_index(index_name):
    pc = Pinecone(api_key=PINECONE_API_KEY)
    if index_name not in pc.list_indexes().names():
        pc.create_index(
            name=index_name,
            dimension=EMBEDDING_DIM,
            metric="cosine",
            spec=ServerlessSpec(cloud='aws', region='us-east-1')
        )
    print("initialized pinecone index")
    return PineconeVectorStore(index_name=index_name, embedding=OllamaEmbeddings(model="nomic-embed-text"))


def get_docsearch_for_resident(resident_id):
    """
    Get vector search specifically filtered for a resident
    """
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    
    # Use filter to only return vectors with matching resident_id
    docsearch = PineconeVectorStore(
        index_name="hackdavis-rag-index",
        embedding=embeddings,
        text_key="text",
        pinecone_api_key=PINECONE_API_KEY,
        filter={"resident_id": resident_id}
    )

    init_pinecone_index(index_name)
    
    return docsearch
    
