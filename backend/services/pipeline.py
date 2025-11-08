"""
Pipeline service that combines transcription and reasoning.
Takes audio input → transcribes → generates SOAP notes.
"""

from typing import Optional, Dict
import logging
from backend.services.transcription import get_transcription_service
from backend.services.reasoning import get_nemotron_service

logger = logging.getLogger(__name__)


class PipelineService:
    """
    Service that orchestrates the full pipeline:
    1. Audio → Transcription (using TranscriptionService)
    2. Transcription → SOAP Notes (using ReasoningService)
    """

    def __init__(self, transcription_model_size: str = "base"):
        """Initialize the pipeline service."""
        self.transcription_service = get_transcription_service(model_size=transcription_model_size)
        self.reasoning_service = get_nemotron_service()
        self._transcription_initialized = False
        self._reasoning_initialized = False
    
    def initialize(self):
        """Initialize both transcription and reasoning services."""
        if not self._transcription_initialized:
            logger.info("Initializing transcription service...")
            self.transcription_service.initialize()
            self._transcription_initialized = True
        
        if not self._reasoning_initialized:
            logger.info("Initializing reasoning service...")
            self.reasoning_service.initialize()
            self._reasoning_initialized = True

    def process_audio_to_soap(
        self,
        audio_file_path: str,
        mood: Optional[str] = None,
        language: str = "en",
        max_new_tokens: int = 400,
        temperature: float = 0.7
    ) -> Dict:
        """Process audio file to generate SOAP notes."""

        self.initialize()

        # Step 1: Transcribe
        logger.info(f"Transcribing audio file: {audio_file_path}")
        transcript, transcription_info = self.transcription_service.transcribe_file(
            audio_file_path,
            language=language
        )

        if not transcript.strip():
            raise ValueError("No speech detected in the audio file.")

        # Step 2: Generate SOAP notes
        logger.info("Generating SOAP notes...")
        soap_summary = self.reasoning_service.summarize_with_nemotron(
            transcript=transcript,
            mood=mood,
            max_new_tokens=max_new_tokens,
            temperature=temperature
        )

        return {
            "transcript": transcript,
            "soap_summary": soap_summary,
            "transcription_info": transcription_info,
            "mood": mood
        }

    def process_transcript_to_soap(
        self,
        transcript: str,
        mood: Optional[str] = None,
        max_new_tokens: int = 400,
        temperature: float = 0.7
    ) -> Dict:
        """Process transcript to generate SOAP notes."""

        self.initialize()

        soap_summary = self.reasoning_service.summarize_with_nemotron(
            transcript=transcript,
            mood=mood,
            max_new_tokens=max_new_tokens,
            temperature=temperature
        )

        return {
            "transcript": transcript,
            "soap_summary": soap_summary,
            "mood": mood
        }

# Global instance (singleton pattern)
_pipeline_service: Optional[PipelineService] = None


def get_pipeline_service(transcription_model_size: str = "base") -> PipelineService:
    """Get or create the global pipeline service instance."""
    global _pipeline_service
    if _pipeline_service is None:
        _pipeline_service = PipelineService(transcription_model_size=transcription_model_size)
    return _pipeline_service