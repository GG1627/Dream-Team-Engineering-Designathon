"""
API Routes for the pipeline service.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import tempfile
import os
import torch
from backend.services.pipeline import get_pipeline_service

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

class TranscriptRequest(BaseModel):
    """Request model for transcript -> SOAP """
    transcript: str
    mood: Optional[str] = None
    max_new_tokens: Optional[int] = 400
    temperature: Optional[float] = 0.7

class PipelineResponse(BaseModel):
    """Response model for pipeline results."""
    transcript: str
    soap_summary: str
    transcription_info: Optional[dict] = None
    mood: Optional[str] = None

@router.post("/audio-to-soap", response_model=PipelineResponse)
async def audio_to_soap(
    file: UploadFile = File(...),
    mood: Optional[str] = Form(None),
    language: str = Form("en"),
    max_new_tokens: Optional[int] = Form(400),
    temperature: Optional[float] = Form(0.7)
):

    """
    Process audio file through the pipeline: transcription -> SOAP notes.
    """

    # Clear CUDA cache before processing to free up memory
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        import gc
        gc.collect()
        torch.cuda.empty_cache()  # Double clear for good measure

    # create a temporary file to save uploaded audio
    temp_file_path = None
    try:
        # save uploaded file to a temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1] if file.filename else ".wav") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # get pippeline service
        pipeline = get_pipeline_service()

        # process thorugh pipeline
        result = pipeline.process_audio_to_soap(
            audio_file_path=temp_file_path,
            mood=mood,
            language=language,
            max_new_tokens=max_new_tokens,
            temperature=temperature
        )

        # Clear CUDA cache after processing
        if torch.cuda.is_available():
            import gc
            gc.collect()
            torch.cuda.empty_cache()

        return PipelineResponse(
            transcript=result["transcript"],
            soap_summary=result["soap_summary"],
            transcription_info=result.get("transcription_info"),
            mood=result.get("mood")
        )

    except ValueError as e:
        # Clear cache on error too
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Clear cache on error too
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    finally:
        # clean up temp file and clear cache
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except:
                pass
        # Final cache clear
        if torch.cuda.is_available():
            import gc
            gc.collect()
            torch.cuda.empty_cache()

@router.post("/transcribe-chunk")
async def transcribe_chunk(
    file: UploadFile = File(...),
    language: str = Form("en")
):
    """
    Transcribe a small audio chunk for real-time streaming.
    Returns just the transcript (no SOAP generation for speed).
    """
    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        pipeline = get_pipeline_service()
        pipeline.initialize()
        
        # Just transcribe, don't generate SOAP (faster)
        transcript, info = pipeline.transcription_service.transcribe_file(
            temp_file_path,
            language=language
        )
        
        return {
            "transcript": transcript,
            "language": info.get("language"),
            "confidence": info.get("language_probability", 0)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error transcribing chunk: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except:
                pass

@router.post("/transcript-to-soap", response_model=PipelineResponse)
async def transcript_to_soap(request: TranscriptRequest):
    try:
        pipeline = get_pipeline_service()
        
        result = pipeline.process_transcript_to_soap(
            transcript=request.transcript,
            mood=request.mood,
            max_new_tokens=request.max_new_tokens or 400,
            temperature=request.temperature or 0.7
        )
        
        return PipelineResponse(
            transcript=result["transcript"],
            soap_summary=result["soap_summary"],
            mood=result.get("mood")
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating SOAP summary: {str(e)}"
        )


@router.post("/clear-cache")
async def clear_cache():
    """Clear CUDA cache to free up GPU memory."""
    try:
        if torch.cuda.is_available():
            import gc
            gc.collect()
            torch.cuda.empty_cache()
            # Double clear for good measure
            gc.collect()
            torch.cuda.empty_cache()
            
            # Get memory stats
            allocated = torch.cuda.memory_allocated() / 1024**3  # GB
            reserved = torch.cuda.memory_reserved() / 1024**3  # GB
            
            return {
                "status": "success",
                "message": "CUDA cache cleared",
                "memory_allocated_gb": round(allocated, 2),
                "memory_reserved_gb": round(reserved, 2)
            }
        else:
            return {
                "status": "success",
                "message": "CUDA not available, no cache to clear"
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@router.get("/health")
async def health_check():
    """Check if the pipeline service is ready."""
    try:
        pipeline = get_pipeline_service()
        
        return {
            "status": "ready",
            "transcription_initialized": pipeline._transcription_initialized,
            "reasoning_initialized": pipeline._reasoning_initialized
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }