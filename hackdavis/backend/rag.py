# import os
# from langchain_community.document_loaders import PyPDFLoader
# from langchain.text_splitter import RecursiveCharacterTextSplitter
# from langchain.chains.question_answering import load_qa_chain
# from pinecone import Pinecone, ServerlessSpec
# from langchain_pinecone import PineconeVectorStore
# from langchain_community.embeddings import OllamaEmbeddings
# from langchain_cerebras import ChatCerebras

# # === CONFIGURATION ===
# CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
# PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
# os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY

# print(f"Cerebras API key: {CEREBRAS_API_KEY}")
# print(f"Pinecone API key: {PINECONE_API_KEY}")
# INDEX_NAME = "rag-index"
# EMBEDDING_DIM = 768

# # === LOAD AND PROCESS PDF ===
# def load_and_split_pdf(pdf_path):
#     loader = PyPDFLoader(pdf_path)
#     data = loader.load()
#     splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
#     return splitter.split_documents(data)

# # === UPLOAD VECTORS TO PINECONE ===
# def upload_vectors(texts, embeddings, index_name):
#     vector_store = PineconeVectorStore(index_name=index_name, embedding=embeddings)
#     for t in texts:
#         vector_store.add_texts([t.page_content])
#     return vector_store

# # === INITIALIZE PINECONE INDEX ===
# def init_pinecone_index(index_name):
#     pc = Pinecone()
#     if index_name not in pc.list_indexes().names():
#         pc.create_index(
#             name=index_name,
#             dimension=EMBEDDING_DIM,
#             metric="cosine",
#             spec=ServerlessSpec(cloud='aws', region='us-east-1')
#         )
#     return PineconeVectorStore(index_name=index_name, embedding=OllamaEmbeddings(model="nomic-embed-text"))

# # === MAIN FUNCTION ===
# def main(pdf_path, user_prompt):
#     # Load PDF and split text
#     docs = load_and_split_pdf(pdf_path)

#     # Initialize vector store
#     embeddings = OllamaEmbeddings(model="nomic-embed-text")
#     init_pinecone_index(INDEX_NAME)
#     vector_store = upload_vectors(docs, embeddings, INDEX_NAME)

#     # Retrieve relevant documents
#     relevant_docs = vector_store.similarity_search(user_prompt)

#     # Ask question via Cerebras
#     llm = ChatCerebras(api_key=CEREBRAS_API_KEY)
#     chain = load_qa_chain(llm, chain_type="stuff")
#     response = chain.run(input_documents=relevant_docs, question=user_prompt)

#     return response

# # === EXAMPLE USAGE ===
# if __name__ == "__main__":
#     # pdf_path = "example.pdf"  # Replace with your actual path
#     # question = "What is the main topic discussed in the document?"  # Replace with your question
#     # result = main(pdf_path, question)
#     # print("Answer:", result)
#     CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
#     PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

#     print(f"Cerebras API key: {CEREBRAS_API_KEY}")
#     print(f"Pinecone API key: {PINECONE_API_KEY}")
    
