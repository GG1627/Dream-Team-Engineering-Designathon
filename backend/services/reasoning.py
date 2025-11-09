"""
Groq API reasoning service for medical transcription analysis.
Converts transcription text into SOAP format summaries using Groq API for fast inference.
"""

import os
import logging
from typing import Optional

# Try to import Groq, fallback message if not available
try:
    from langchain_groq import ChatGroq
    from langchain_core.prompts import ChatPromptTemplate
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("langchain-groq not available. Install with: pip install langchain-groq")

logger = logging.getLogger(__name__)


class NemotronReasoningService:
    """Service for running SOAP note generation using Groq API for fast inference."""
    
    def __init__(self, model_id: str = "llama-3.1-8b-instant"):
        """
        Initialize the Groq reasoning service.
        
        Args:
            model_id: Groq model identifier (llama-3.1-8b-instant, qwen/qwen2.5-7b-instant, etc.)
        """
        if not GROQ_AVAILABLE:
            raise ImportError(
                "langchain-groq is not installed. Install it with: pip install langchain-groq"
            )
        
        self.model_id = model_id
        self.llm = None
        self.device = "groq_api"  # Not a real device, but for compatibility
        self._initialized = False
        
        # API key handling (same pattern as agentic_rag.py)
        self.HARDCODED_API_KEY = "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"
        self.api_key = os.getenv("GROQ_API_KEY") or self.HARDCODED_API_KEY
    
    def initialize(self):
        """Initialize the Groq LLM."""
        if self._initialized:
            return
        
        try:
            logger.info(f"Initializing Groq API with model: {self.model_id}")
            print(f"Loading Groq API model: {self.model_id}...")
            
            self.llm = ChatGroq(
                groq_api_key=self.api_key,
                model_name=self.model_id,
                temperature=0.7,
            )
            
            self._initialized = True
            logger.info(f"✓ Groq API initialized successfully with {self.model_id}")
            print(f"✓ Groq API model ready: {self.model_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Groq API: {e}")
            raise
    
    def summarize_with_nemotron(
        self, 
        transcript: str, 
        mood: Optional[str] = None,
        max_new_tokens: int = 400,
        temperature: float = 0.7
    ) -> str:
        """
        Generate SOAP format summary from transcription using Groq API.
        
        Args:
            transcript: The transcribed text
            mood: Detected emotion/mood (optional)
            max_new_tokens: Maximum tokens to generate (default: 400, note: Groq handles this automatically)
            temperature: Sampling temperature (0.0-1.0)
        
        Returns:
            Generated SOAP format summary
        """
        if not self._initialized:
            self.initialize()
        
        # Build prompt for SOAP note generation
        mood_text = f"Detected emotion: {mood}" if mood else "No emotion detected"
        
        # Create prompt template
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", "You are a medical assistant that converts patient transcriptions into concise SOAP (Subjective, Objective, Assessment, Plan) format notes. Be precise, professional, and focus on key medical information."),
            ("human", """Patient transcription: "{transcript}"

{mood_text}

Generate a concise medical SOAP note summary with the following sections:
- Subjective: Patient's reported symptoms, concerns, and history
- Objective: Observable findings, vital signs, or clinical observations (if any mentioned)
- Assessment: Clinical impression, diagnosis, or differential diagnosis
- Plan: Recommended next steps, treatment plan, or follow-up actions

Format the response clearly with section headers. Keep it concise and clinically relevant.""")
        ])
        
        try:
            # Update temperature if different from default
            if temperature != 0.7:
                self.llm.temperature = temperature
            
            # Create chain and invoke
            chain = prompt_template | self.llm
            response = chain.invoke({
                "transcript": transcript.strip(),
                "mood_text": mood_text
            })
            
            # Extract content from response
            soap_summary = response.content if hasattr(response, 'content') else str(response)
            
            # Clean up the output
            soap_summary = self._clean_soap_output(soap_summary)
            
            return soap_summary
            
        except Exception as e:
            logger.error(f"Error during Groq API generation: {e}")
            raise
    
    def _clean_soap_output(self, text: str) -> str:
        """
        Clean and format SOAP output for better readability.
        Stops processing when junk text markers are detected.
        
        Args:
            text: Raw generated text
        
        Returns:
            Cleaned SOAP format text
        """
        lines = text.split('\n')
        cleaned_lines = []
        seen_sections = set()
        stop_here = False
        
        # Markers that indicate we've hit junk text after the SOAP note
        junk_markers = [
            "Patient transcription:",
            "Generate a comprehensive",
            "Severe emotional distress detected",
            "Detected emotion:",
            "Summarize the case",
            "Patient said:",
            "The patient said:",
            "Here's a SOAP note",
            "Based on the transcription"
        ]
        
        for line in lines:
            if stop_here:
                break
                
            line_stripped = line.strip()
            
            # Stop if we hit junk text markers
            if any(marker in line_stripped for marker in junk_markers):
                stop_here = True
                break
            
            # Remove markdown formatting if present
            line_stripped = line_stripped.replace("**", "").replace("__", "").replace("*", "")
            
            # Check if this is a section header
            if line_stripped.startswith('- ') and ':' in line_stripped:
                section = line_stripped.split(':')[0].strip()
                if section not in seen_sections:
                    seen_sections.add(section)
                    cleaned_lines.append(line_stripped)
                # Skip duplicate headers
            elif line_stripped.startswith('**') and '**' in line_stripped:
                # Handle markdown headers like **Subjective:**
                section = line_stripped.replace('**', '').replace('*', '').strip()
                if ':' in section:
                    section_name = section.split(':')[0].strip()
                    if section_name not in seen_sections:
                        seen_sections.add(section_name)
                        cleaned_lines.append(f"- {section}")
            elif line_stripped:
                cleaned_lines.append(line_stripped)
            elif cleaned_lines:  # Keep single blank lines between sections
                cleaned_lines.append('')
        
        # Join and clean up extra whitespace
        cleaned_text = '\n'.join(cleaned_lines)
        
        # Remove multiple consecutive blank lines
        import re
        cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
        
        # Final cleanup: remove any remaining junk text that might have slipped through
        for marker in junk_markers:
            if marker in cleaned_text:
                idx = cleaned_text.find(marker)
                cleaned_text = cleaned_text[:idx].strip()
                break
        
        return cleaned_text.strip()
    
    def is_initialized(self) -> bool:
        """Check if service is initialized."""
        return self._initialized


# Global instance (singleton pattern)
_nemotron_service: Optional[NemotronReasoningService] = None


def get_nemotron_service() -> NemotronReasoningService:
    """Get or create the global reasoning service instance."""
    global _nemotron_service
    if _nemotron_service is None:
        _nemotron_service = NemotronReasoningService()
    return _nemotron_service
