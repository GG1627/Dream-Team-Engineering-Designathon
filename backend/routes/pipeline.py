"""
API Routes for the pipeline service.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import tempfile
import os
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

        return PipelineResponse(
            transcript=result["transcript"],
            soap_summary=result["soap_summary"],
            transcription_info=result.get("transcription_info"),
            mood=result.get("mood")
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    finally:
        # clean up temp file
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