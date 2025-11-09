"""
Transcription service using faster-whisper for audio-to-text conversion.
"""

import wave
import sounddevice as sd
import numpy as np
import os
import time
import torch
from faster_whisper import WhisperModel
from typing import Optional, Tuple, List, Dict
import logging

logger = logging.getLogger(__name__)


class TranscriptionService:
    """Service for audio transcription using faster-whisper."""
    
    def __init__(self, model_size: str = "base"):
        """
        Initialize the transcription service.
        
        Args:
            model_size: Whisper model size (tiny, base, small, medium, large-v3)
        """
        self.model_size = model_size
        self.model = None
        self.device = None
        self.compute_type = None
        self.chunk_length = None
        self.beam_size = None
        self._initialized = False
    
    def _detect_device(self) -> Tuple[str, str]:
        """Detect best available device and compute type."""
        try:
            if torch.cuda.is_available():
                cuda_version = torch.version.cuda
                logger.info(f"CUDA detected (version {cuda_version})")
                return "cuda", "float16"
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"CUDA check failed: {e}, falling back to CPU")
        
        return "cpu", "int8"
    
    def initialize(self):
        """Load the Whisper model."""
        if self._initialized:
            return
        
        self.device, self.compute_type = self._detect_device()
        
        logger.info(f"Loading Whisper model: {self.model_size} on {self.device}")
        start_time = time.time()
        
        self.model = WhisperModel(
            self.model_size,
            device=self.device,
            compute_type=self.compute_type,
            num_workers=4 if self.device == "cpu" else 1
        )
        
        load_time = time.time() - start_time
        logger.info(f"Model loaded in {load_time:.2f}s")
        
        # Set optimal parameters based on device
        if self.device == "cuda":
            self.chunk_length = 4
            self.beam_size = 5
        else:
            self.chunk_length = 3
            self.beam_size = 3
        
        self._initialized = True
    
    def record_chunk(self, file_path: str, chunk_length: Optional[float] = None, sample_rate: int = 16000) -> None:
        """
        Record an audio chunk from the microphone.
        
        Args:
            file_path: Path to save the audio file
            chunk_length: Length of chunk in seconds (uses default if None)
            sample_rate: Audio sample rate
        """
        if chunk_length is None:
            chunk_length = self.chunk_length if self.chunk_length else 3
        
        audio_data = sd.rec(
            int(chunk_length * sample_rate),
            samplerate=sample_rate,
            channels=1,
            dtype=np.int16
        )
        sd.wait()
        
        with wave.open(file_path, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(audio_data.tobytes())
    
    def transcribe_file(
        self, 
        file_path: str,
        language: str = "en",
        beam_size: Optional[int] = None
    ) -> Tuple[str, Dict]:
        """
        Transcribe an audio file.
        
        Args:
            file_path: Path to audio file
            language: Language code (default: "en")
            beam_size: Beam size for decoding (uses default if None)
        
        Returns:
            Tuple of (transcribed_text, info_dict)
        """
        if not self._initialized:
            self.initialize()
        
        if beam_size is None:
            beam_size = self.beam_size
        
        segments, info = self.model.transcribe(
            file_path,
            beam_size=beam_size,
            language=language,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                threshold=0.5
            ),
            temperature=0.0,
            condition_on_previous_text=True,
            initial_prompt="This is a conversation.",
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6
        )
        
        # Process segments
        text = ""
        segment_list = []
        for segment in segments:
            text += segment.text + " "
            segment_list.append({
                "text": segment.text,
                "start": segment.start,
                "end": segment.end
            })
        
        info_dict = {
            "language": info.language,
            "language_probability": info.language_probability,
            "segments": segment_list
        }
        
        # Clear CUDA cache after transcription to free memory
        if self.device == "cuda":
            import torch
            torch.cuda.empty_cache()
        
        return text.strip(), info_dict
    
    def transcribe_chunk(
        self,
        chunk_file: str,
        language: str = "en"
    ) -> Tuple[str, Dict, float]:
        """
        Transcribe a single audio chunk and return timing info.
        
        Args:
            chunk_file: Path to audio chunk file
            language: Language code
        
        Returns:
            Tuple of (transcribed_text, info_dict, transcription_time)
        """
        start_time = time.time()
        text, info = self.transcribe_file(chunk_file, language)
        elapsed_time = time.time() - start_time
        
        return text, info, elapsed_time
    
    def test_microphone(self, test_duration: float = 0.5) -> bool:
        """
        Test if microphone is working.
        
        Args:
            test_duration: Duration of test recording in seconds
        
        Returns:
            True if microphone works, False otherwise
        """
        test_file = "test_mic.wav"
        try:
            self.record_chunk(test_file, chunk_length=test_duration)
            
            with wave.open(test_file, 'rb') as wf:
                frames = wf.getnframes()
                if frames > 0:
                    logger.info(f"Microphone test passed ({frames} frames)")
                    if os.path.exists(test_file):
                        os.remove(test_file)
                    return True
            
            if os.path.exists(test_file):
                os.remove(test_file)
            return False
            
        except Exception as e:
            logger.error(f"Microphone test failed: {e}")
            if os.path.exists(test_file):
                try:
                    os.remove(test_file)
                except:
                    pass
            return False
    
    def get_available_devices(self) -> List[Dict]:
        """Get list of available audio input devices."""
        devices = sd.query_devices()
        input_devices = []
        for i, device in enumerate(devices):
            if device['max_input_channels'] > 0:
                input_devices.append({
                    "index": i,
                    "name": device['name'],
                    "channels": device['max_input_channels']
                })
        return input_devices
    
    def set_input_device(self, device_index: int):
        """Set the default input device."""
        sd.default.device[0] = device_index
    
    def is_initialized(self) -> bool:
        """Check if model is initialized."""
        return self._initialized


# Global instance (singleton pattern)
_transcription_service: Optional[TranscriptionService] = None


def get_transcription_service(model_size: str = "base") -> TranscriptionService:
    """Get or create the global transcription service instance."""
    global _transcription_service
    if _transcription_service is None:
        _transcription_service = TranscriptionService(model_size=model_size)
    return _transcription_service

