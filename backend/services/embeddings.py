from sentence_transformers import SentenceTransformer
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings
from typing import List
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Custom LangChain embeddings wrapper for SentenceTransformer
class SentenceTransformerEmbeddings(Embeddings):
    def __init__(self, model_name: str = 'sentence-transformers/all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents."""
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
    
    def embed_query(self, text: str) -> List[float]:
        """Embed a single query."""
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

# Initialize embeddings
embeddings = SentenceTransformerEmbeddings('sentence-transformers/all-MiniLM-L6-v2')

# FAISS index path
# Use absolute path relative to this file's location to avoid working directory issues
_this_file_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_this_file_dir)  # Go up from services/ to backend/
_default_index_path = os.path.join(_backend_dir, "faiss_index")
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", _default_index_path)

# Load PDF documents - use absolute path relative to backend directory
_documents_dir = os.path.join(_backend_dir, "documents")
loader = PyPDFDirectoryLoader(_documents_dir)
documents = loader.load()

# Split documents into chunks
text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
docs = text_splitter.split_documents(documents)

# Store chunks in vector store
vector_store = FAISS.from_documents(
    docs,
    embeddings
)

# Save the vector store to disk
vector_store.save_local(FAISS_INDEX_PATH)

print(f"Vector store created with {len(docs)} documents and saved to {FAISS_INDEX_PATH}")