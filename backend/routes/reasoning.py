"""
API routes for Nemotron reasoning model.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.services.reasoning import get_nemotron_service

router = APIRouter(prefix="/reasoning", tags=["reasoning"])


class TranscriptionRequest(BaseModel):
    """Request model for transcription reasoning."""
    transcript: str
    mood: Optional[str] = None
    max_new_tokens: Optional[int] = 250
    temperature: Optional[float] = 0.7


class ReasoningResponse(BaseModel):
    """Response model for reasoning results."""
    soap_summary: str
    transcript: str
    mood: Optional[str] = None


@router.post("/summarize", response_model=ReasoningResponse)
async def summarize_transcription(request: TranscriptionRequest):
    """
    Generate SOAP format summary from transcription text.
    
    Args:
        request: Transcription and optional mood information
    
    Returns:
        SOAP format summary
    """
    try:
        service = get_nemotron_service()
        
        # Initialize if not already done
        if not service.is_initialized():
            service.initialize()
        
        # Generate summary
        soap_summary = service.summarize_with_nemotron(
            transcript=request.transcript,
            mood=request.mood,
            max_new_tokens=request.max_new_tokens,
            temperature=request.temperature
        )
        
        return ReasoningResponse(
            soap_summary=soap_summary,
            transcript=request.transcript,
            mood=request.mood
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating summary: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Check if the reasoning service is ready."""
    try:
        service = get_nemotron_service()
        initialized = service.is_initialized()
        
        return {
            "status": "ready" if initialized else "not_initialized",
            "model_id": service.model_id if initialized else None,
            "device": service.device if initialized else None
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


