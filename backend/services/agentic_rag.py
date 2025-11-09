"""
Agentic RAG service using Groq API for fast LLM inference.
✅ Compatible with LangChain >= 1.0.0 and langchain-community >= 0.4.x
"""

import os
import logging
from dotenv import load_dotenv
from typing import List, Optional

from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFDirectoryLoader

from sentence_transformers import SentenceTransformer

# Try to import Groq, fallback to HuggingFace if not available
try:
    from langchain_groq import ChatGroq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    from langchain_community.llms import HuggingFacePipeline
    from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
    import torch

# ------------------------------------------------------------------- #
# ENV + LOGGING
# ------------------------------------------------------------------- #
# Load .env file (tries .env.local first if it exists)
load_dotenv()  # Loads .env
load_dotenv(".env.local")  # Also try .env.local (overrides .env if exists)
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------- #
# Embeddings
# ------------------------------------------------------------------- #
class SentenceTransformerEmbeddings(Embeddings):
    """Wrapper for SentenceTransformer embeddings (open-source)."""

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.model.encode(texts, convert_to_numpy=True).tolist()

    def embed_query(self, text: str) -> List[float]:
        return self.model.encode(text, convert_to_numpy=True).tolist()

# ------------------------------------------------------------------- #
# LLM Setup (Groq API or HuggingFace fallback)
# ------------------------------------------------------------------- #
def create_llm(use_groq: bool = True, groq_api_key: Optional[str] = None, model_name: str = "llama-3.1-8b-instant"):
    """
    Create LLM - uses Groq API by default for fast inference (<1 second responses).
    Falls back to HuggingFace if Groq is not available.
    
    Args:
        use_groq: Whether to use Groq API (default: True)
        groq_api_key: Groq API key (default: from GROQ_API_KEY env var or hardcoded)
        model_name: Groq model name (default: llama-3.1-8b-instant - fastest)
    
    Returns:
        LLM instance
    """
    if use_groq and GROQ_AVAILABLE:
        # Hardcoded API key as fallback (for development)
        HARDCODED_API_KEY = os.getenv("GROQ_API_KEY")
        api_key = groq_api_key or os.getenv("GROQ_API_KEY") or HARDCODED_API_KEY
        
        if not api_key:
            logger.warning("GROQ_API_KEY not found, falling back to HuggingFace")
            return create_huggingface_llm()
        
        logger.info(f"✅ Using Groq API with model: {model_name}")
        return ChatGroq(
            groq_api_key=api_key,
            model_name=model_name,
            temperature=0.3,  # Lower temperature for more focused answers
            max_tokens=150,  # Shorter responses for faster generation
        )
    else:
        logger.info("Using HuggingFace local model (slower)")
        return create_huggingface_llm()


def create_huggingface_llm(model_id="TinyLlama/TinyLlama-1.1B-Chat-v1.0"):
    """Fallback: Create a local HuggingFace LLM pipeline."""
    try:
        import torch
        from langchain_community.llms import HuggingFacePipeline
        from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
    except ImportError:
        raise ImportError("HuggingFace dependencies not available. Install transformers and torch.")
    
    device = 0 if torch.cuda.is_available() else -1
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch.float16 if device == 0 else torch.float32,
    )
    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=80,
        temperature=0.3,
        do_sample=True,
        device=device,
        pad_token_id=tokenizer.eos_token_id,
        return_full_text=False,
    )
    return HuggingFacePipeline(pipeline=pipe)

# ------------------------------------------------------------------- #
# FAISS Vector Store
# ------------------------------------------------------------------- #
embeddings = SentenceTransformerEmbeddings("sentence-transformers/all-MiniLM-L6-v2")

# Path to persist the FAISS index
# Use absolute path relative to this file's location to avoid working directory issues
_this_file_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_this_file_dir)  # Go up from services/ to backend/
_default_index_path = os.path.join(_backend_dir, "faiss_index")
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", _default_index_path)
logger.info(f"📁 FAISS index path: {FAISS_INDEX_PATH}")

# Try to load existing index, or create new one
vector_store = None
try:
    if os.path.exists(FAISS_INDEX_PATH) and os.path.isdir(FAISS_INDEX_PATH):
        vector_store = FAISS.load_local(
            FAISS_INDEX_PATH,
            embeddings,
            allow_dangerous_deserialization=True  # Required for security warning
        )
        logger.info(f"✅ Loaded existing FAISS index from {FAISS_INDEX_PATH}")
    else:
        raise FileNotFoundError(f"FAISS index not found at {FAISS_INDEX_PATH}")
except Exception as e:
    logger.info(f"Creating new FAISS index at {FAISS_INDEX_PATH} (Error: {e})")
    # Create empty vector store (will be populated when documents are added)
    # Use a dummy text to initialize, then we'll manage it through add_texts
    vector_store = FAISS.from_texts(
        texts=["_placeholder_"],  # Placeholder text
        embedding=embeddings
    )
    # Save empty index so it can be loaded next time
    os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
    vector_store.save_local(FAISS_INDEX_PATH)

retriever = vector_store.as_retriever(search_kwargs={"k": 8})  # Changed from 3 to 5

# ------------------------------------------------------------------- #
# Format Documents Helper
# ------------------------------------------------------------------- #
def format_docs(docs):
    """Format retrieved documents into a context string."""
    return "\n\n".join([doc.page_content for doc in docs])

# ------------------------------------------------------------------- #
# Prompt Template (Optimized for speed and clarity)
# ------------------------------------------------------------------- #
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful medical assistant named Katie. The user is asking about their own medical information. When asked about their name, look for phrases like 'named [Name]', 'I am [Name]', or check the author field in metadata. Answer directly and confidently. If you see 'Gael Garcia' or any name in the context, say it immediately. Only say 'I don't have enough information' if you genuinely cannot find the answer after reading ALL the context carefully."),
    ("human", "Medical Records Context:\n{context}\n\nUser Question: {question}\n\nYour Answer (be direct and concise):")
])

# ------------------------------------------------------------------- #
# Build the RAG Chain
# ------------------------------------------------------------------- #
# Initialize LLM (Groq by default, falls back to HuggingFace)
# API key is hardcoded as fallback - will use env var if available, otherwise hardcoded key
llm = create_llm(use_groq=True)

# Build RAG chain with output parser for clean text extraction
rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# ------------------------------------------------------------------- #
# Query Function (Optimized for speed)
# ------------------------------------------------------------------- #
def query_rag(question: str, refresh_store: bool = False):
    """
    Query the RAG system with Groq API for fast responses (<1-2 seconds).
    
    Args:
        question: The question to ask
        refresh_store: If True, reload vector store from disk (default: False)
    
    Returns:
        Answer string
    """
    global vector_store, retriever, rag_chain
    
    # Only reload vector store if explicitly requested (after adding new documents)
    if refresh_store:
        try:
            if os.path.exists(FAISS_INDEX_PATH) and os.path.isdir(FAISS_INDEX_PATH):
                vector_store = FAISS.load_local(
                    FAISS_INDEX_PATH,
                    embeddings,
                    allow_dangerous_deserialization=True
                )
                retriever = vector_store.as_retriever(search_kwargs={"k": 8})  # Changed from 3 to 5
                # Rebuild RAG chain with updated retriever
                rag_chain = (
                    {"context": retriever | format_docs, "question": RunnablePassthrough()}
                    | prompt
                    | llm
                    | StrOutputParser()
                )
                logger.info("✅ Vector store refreshed")
        except Exception as e:
            logger.warning(f"Could not refresh vector store: {e}, using existing")
    
    # Invoke the RAG chain
    try:
        # Debug: See what context is being retrieved
        if logger.level <= logging.DEBUG:
            retrieved_docs = retriever.get_relevant_documents(question) if hasattr(retriever, 'get_relevant_documents') else retriever.invoke(question)
            logger.debug(f"Retrieved {len(retrieved_docs)} documents for query: {question}")
            for i, doc in enumerate(retrieved_docs, 1):
                logger.debug(f"Doc {i}: {doc.page_content[:200]}...")
        
        result = rag_chain.invoke(question)
        # Clean up the answer (remove any extra formatting)
        result = _clean_answer(result, question)
        return result
    except Exception as e:
        logger.error(f"Error querying RAG: {e}")
        return "I'm sorry, I encountered an error processing your question. Please try again."


def _clean_answer(text: str, question: str) -> str:
    """Clean and extract just the answer from LLM output."""
    if not isinstance(text, str):
        text = str(text)
    
    # Remove the question if it's repeated in the answer
    if question.lower() in text.lower():
        # Find where the answer starts (after the question)
        parts = text.split(question, 1)
        if len(parts) > 1:
            text = parts[-1].strip()
    
    # Remove common prefixes
    prefixes = ["Answer:", "answer:", "Response:", "response:"]
    for prefix in prefixes:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    
    # Remove any trailing questions or extra text
    stop_phrases = [
        "\n\nQuestion:",
        "\nQuestion:",
        "\n\nIf you",
        "\nIf you don't",
        "\n\nContext:",
    ]
    for phrase in stop_phrases:
        if phrase in text:
            text = text.split(phrase)[0].strip()
    
    return text.strip()


def refresh_vector_store():
    """Refresh the vector store from disk. Call this after adding new documents."""
    query_rag("", refresh_store=True)

# ------------------------------------------------------------------- #
# Clear and Rebuild Vector Store
# ------------------------------------------------------------------- #
def clear_vector_store():
    """
    Clear the entire vector store and create a fresh one.
    This deletes all existing documents.
    """
    global vector_store, retriever, rag_chain
    try:
        # Create a new empty vector store
        vector_store = FAISS.from_texts(
            texts=["_placeholder_"],
            embedding=embeddings
        )
        # Save empty index
        os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
        vector_store.save_local(FAISS_INDEX_PATH)
        # Update retriever and chain
        retriever = vector_store.as_retriever(search_kwargs={"k": 8})
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )
        logger.info("✅ Vector store cleared")
        return True
    except Exception as e:
        logger.error(f"Error clearing vector store: {e}")
        return False


def load_pdfs_from_directory(documents_dir: str = None, clear_existing: bool = True):
    """
    Load all PDF documents from a directory and add them to the vector store.
    
    Args:
        documents_dir: Path to directory containing PDF files. If None, uses "backend/documents" relative to this file.
        clear_existing: If True, clear existing vector store before loading (default: True)
    
    Returns:
        Number of documents loaded, or None if error
    """
    global vector_store, retriever, rag_chain
    try:
        # Default to backend/documents directory if not specified
        if documents_dir is None:
            # Get the directory where this file is located (backend/services)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Go up one level to backend, then into documents
            backend_dir = os.path.dirname(current_dir)
            documents_dir = os.path.join(backend_dir, "documents")
        
        # Convert to absolute path
        documents_dir = os.path.abspath(documents_dir)
        
        # Clear existing store if requested
        if clear_existing:
            logger.info("Clearing existing vector store...")
            clear_vector_store()
        
        # Check if directory exists
        if not os.path.exists(documents_dir):
            logger.error(f"Documents directory not found: {documents_dir}")
            return None
        
        # Load PDF documents
        logger.info(f"Loading PDFs from {documents_dir}...")
        loader = PyPDFDirectoryLoader(documents_dir)
        documents = loader.load()
        
        if not documents:
            logger.warning(f"No documents found in {documents_dir}")
            return 0
        
        logger.info(f"Loaded {len(documents)} documents from PDFs")
        
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        split_docs = text_splitter.split_documents(documents)
        logger.info(f"Split into {len(split_docs)} chunks")
        
        # Remove placeholder if it exists
        if vector_store and hasattr(vector_store, 'docstore'):
            try:
                for doc_id, doc in list(vector_store.docstore._dict.items()):
                    if doc.page_content == "_placeholder_":
                        vector_store.delete([doc_id])
                        break
            except Exception:
                pass
        
        # Add documents to vector store
        texts = [doc.page_content for doc in split_docs]
        metadatas = [doc.metadata for doc in split_docs]
        vector_store.add_texts(texts=texts, metadatas=metadatas)
        
        # Save to disk
        os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
        vector_store.save_local(FAISS_INDEX_PATH)
        logger.info(f"✅ Saved {len(split_docs)} chunks to {FAISS_INDEX_PATH}")
        
        # Refresh retriever and chain
        retriever = vector_store.as_retriever(search_kwargs={"k": 8})
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )
        
        return len(documents)
    except Exception as e:
        logger.error(f"Error loading PDFs: {e}")
        return None

# ------------------------------------------------------------------- #
# Helper: Add new documents to FAISS
# ------------------------------------------------------------------- #
def load_documents_to_faiss(texts: List[str], metadatas: List[dict] = None, refresh: bool = True, split_documents: bool = True):
    """
    Embed and upload new texts to the FAISS vector store.
    Documents are split into chunks ONCE when added, then stored.
    When querying, we just retrieve the pre-split chunks - no splitting needed.
    
    Args:
        texts: List of text documents to add
        metadatas: Optional list of metadata dictionaries
        refresh: If True, refresh the in-memory store after adding (default: True)
        split_documents: If True, split documents into chunks (default: True)
    """
    global vector_store, retriever, rag_chain
    if metadatas is None:
        metadatas = [{} for _ in texts]
    
    # Split documents into chunks ONCE when adding (if requested)
    if split_documents:
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        # Convert texts to Document objects, split, then extract texts and metadatas
        documents = [Document(page_content=text, metadata=meta) for text, meta in zip(texts, metadatas)]
        split_docs = text_splitter.split_documents(documents)
        texts = [doc.page_content for doc in split_docs]
        metadatas = [doc.metadata for doc in split_docs]
        logger.info(f"Split {len(documents)} documents into {len(split_docs)} chunks")
    
    # Remove placeholder if it exists
    if vector_store and hasattr(vector_store, 'docstore'):
        try:
            for doc_id, doc in list(vector_store.docstore._dict.items()):
                if doc.page_content == "_placeholder_":
                    vector_store.delete([doc_id])
                    break
        except Exception:
            pass
    
    # Add the (possibly split) documents to the vector store
    vector_store.add_texts(texts=texts, metadatas=metadatas)
    # Persist the index to disk
    os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
    vector_store.save_local(FAISS_INDEX_PATH)
    logger.info(f"✅ Uploaded {len(texts)} document chunks to FAISS and saved to {FAISS_INDEX_PATH}")
    
    # Refresh in-memory store and retriever
    if refresh:
        retriever = vector_store.as_retriever(search_kwargs={"k": 8})
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

# Keep old function name for backwards compatibility
load_documents_to_supabase = load_documents_to_faiss


# ------------------------------------------------------------------- #
# Example Usage
# ------------------------------------------------------------------- #
if __name__ == "__main__":
    # Example: inject your patient doc once
    # (only run once to populate your RAG)
    if os.getenv("LOAD_PATIENT_DOC", "false").lower() == "true":
        patient_record = """
        Gael Garcia is a 21-year-old male with asthma, prediabetes, and a history of ACL repair (2015).
        He takes Metformin for blood sugar control, uses an albuterol inhaler as needed,
        and has a peanut allergy. His father has diabetes. He experiences mild fatigue,
        exercises weekly, and smokes occasionally. Past visits note depression and anxiety
        under stress. Immunizations up to date. Last follow-up six months ago.
        """
        load_documents_to_faiss([patient_record], [{"source": "patient_profile"}])

    # Now query the RAG system
    q = "What medications does Gael Garcia take?"
    print(f"Question: {q}\n")
    print("Answer:\n", query_rag(q))
