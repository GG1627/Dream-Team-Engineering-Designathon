"""
API Routes for RAG (Retrieval Augmented Generation) service.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging
from backend.services.agentic_rag import query_rag, load_documents_to_faiss, load_pdfs_from_directory, clear_vector_store

router = APIRouter(prefix="/rag", tags=["rag"])
logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    """Request model for RAG queries."""
    question: str


class QueryResponse(BaseModel):
    """Response model for RAG queries."""
    answer: str
    question: str


class DocumentRequest(BaseModel):
    """Request model for adding documents."""
    texts: List[str]
    metadatas: Optional[List[dict]] = None
    split_documents: Optional[bool] = True


class DocumentResponse(BaseModel):
    """Response model for adding documents."""
    status: str
    message: str
    documents_added: int
    chunks_created: Optional[int] = None


@router.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Query the RAG system with a question.
    Returns an answer based on the documents in the vector store.
    Documents are already split and stored - no splitting happens here, just retrieval and generation.
    """
    try:
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        answer = query_rag(request.question)
        
        return QueryResponse(
            answer=answer,
            question=request.question
        )
    except Exception as e:
        logger.error(f"Error querying RAG: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )


@router.post("/add-documents", response_model=DocumentResponse)
async def add_documents(request: DocumentRequest):
    """
    Add documents to the RAG vector store.
    Documents will be split into chunks ONCE when adding (if split_documents=True).
    After this, queries just retrieve the pre-split chunks - no splitting needed.
    """
    try:
        if not request.texts or len(request.texts) == 0:
            raise HTTPException(status_code=400, detail="Texts list cannot be empty")
        
        original_count = len(request.texts)
        
        # Load documents (splitting happens inside load_documents_to_faiss if split_documents=True)
        load_documents_to_faiss(
            texts=request.texts,
            metadatas=request.metadatas,
            split_documents=request.split_documents if request.split_documents is not None else True
        )
        
        # Note: We can't easily get the chunk count without modifying the function
        # But the function logs it, so it's fine
        
        return DocumentResponse(
            status="success",
            message=f"Successfully added {original_count} document(s) to the vector store. Documents were split into chunks and are ready for queries.",
            documents_added=original_count
        )
    except Exception as e:
        logger.error(f"Error adding documents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error adding documents: {str(e)}"
        )


@router.post("/rebuild-from-pdfs")
async def rebuild_from_pdfs():
    """
    Rebuild the RAG vector store from PDF documents in the documents directory.
    This will clear existing data and reload all PDFs.
    """
    try:
        # Load PDFs from documents directory (clears existing by default, uses default path)
        num_docs = load_pdfs_from_directory(documents_dir=None, clear_existing=True)
        
        if num_docs is None:
            raise HTTPException(
                status_code=500,
                detail="Failed to load PDFs. Check server logs for details."
            )
        
        return {
            "status": "success",
            "message": f"Successfully rebuilt vector store with {num_docs} document(s)",
            "documents_loaded": num_docs
        }
    except Exception as e:
        logger.error(f"Error rebuilding from PDFs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error rebuilding vector store: {str(e)}"
        )


@router.post("/clear")
async def clear_rag_store():
    """
    Clear all documents from the RAG vector store.
    """
    try:
        success = clear_vector_store()
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to clear vector store"
            )
        
        return {
            "status": "success",
            "message": "Vector store cleared successfully"
        }
    except Exception as e:
        logger.error(f"Error clearing vector store: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing vector store: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Check if the RAG service is ready."""
    try:
        # Try a simple query to check if the service is working
        test_answer = query_rag("test")
        return {
            "status": "ready",
            "message": "RAG service is operational"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

