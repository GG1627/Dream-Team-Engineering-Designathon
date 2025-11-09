"""
NVIDIA Nemotron reasoning model service for medical transcription analysis.
Converts transcription text into SOAP format summaries.
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from typing import Optional
import logging
import re

logger = logging.getLogger(__name__)


class NemotronReasoningService:
    """Service for running NVIDIA Nemotron reasoning model."""
    
    def __init__(self, model_id: str = "microsoft/phi-3-mini-4k-instruct"):
        """
        Initialize the Nemotron reasoning model.
        
        Args:
            model_id: Hugging Face model identifier
        """
        self.model_id = model_id
        self.tokenizer = None
        self.model = None
        self.device = None
        self._initialized = False
    
    def _detect_device(self):
        """Detect best available device (CUDA or CPU)."""
        if torch.cuda.is_available():
            device = "cuda"
            gpu_name = torch.cuda.get_device_name(0)
            cuda_version = torch.version.cuda
            print(f"✓ CUDA available! Using GPU: {gpu_name} (CUDA {cuda_version})")
            logger.info(f"CUDA detected: {gpu_name} (CUDA {cuda_version})")
        else:
            device = "cpu"
            print("⚠ CUDA not available, using CPU")
            logger.warning("CUDA not available, falling back to CPU")
        return device
    
    def initialize(self):
        """Load the model and tokenizer."""
        if self._initialized:
            return
        
        try:
            print(f"Loading Nemotron model: {self.model_id}...")
            self.device = self._detect_device()
            
            # Load tokenizer (Nemotron models require trust_remote_code=True)
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_id,
                trust_remote_code=True
            )
            
            # Load model with appropriate device map and memory optimizations
            # Clear cache before loading to ensure maximum available memory
            if self.device == "cuda":
                torch.cuda.empty_cache()
            
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="cuda" if self.device == "cuda" else None,
                trust_remote_code=True,  # Required for custom models
                attn_implementation="eager",  # Fix for Phi-3 compatibility
                low_cpu_mem_usage=True  # Optimize memory usage
            )
            
            if self.device == "cpu":
                self.model = self.model.to(self.device)
            
            self.model.eval()  # Set to evaluation mode
            self._initialized = True
            print(f"✓ Nemotron model loaded successfully on {self.device}")
            
        except torch.cuda.OutOfMemoryError as e:
            error_msg = "GPU out of memory. Model too large for available VRAM. Try using CPU or a smaller model."
            logger.error(f"{error_msg}: {e}")
            raise RuntimeError(error_msg) from e
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def summarize_with_nemotron(
        self, 
        transcript: str, 
        mood: Optional[str] = None,
        max_new_tokens: int = 400,
        temperature: float = 0.7
    ) -> str:
        """
        Generate SOAP format summary from transcription.
        
        Args:
            transcript: The transcribed text
            mood: Detected emotion/mood (optional)
            max_new_tokens: Maximum tokens to generate (default: 400)
            temperature: Sampling temperature (0.0-1.0)
        
        Returns:
            Generated SOAP format summary
        """
        if not self._initialized:
            self.initialize()
        
        # Build improved prompt for Phi-3
        mood_text = f"Detected emotion: {mood}" if mood else "No emotion detected"
        
        # Use Phi-3's chat format for better results
        prompt = f"""<|user|>
Patient transcription: "{transcript.strip()}"

{mood_text}

Generate a concise medical SOAP note summary.<|end|>
<|assistant|>
- Subjective:
"""
        
        try:
            # Clear CUDA cache before generation to free up memory
            if self.device == "cuda":
                torch.cuda.empty_cache()
            
            # Tokenize input
            inputs = self.tokenizer(
                prompt, 
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(self.device)
            
            # Generate response
            with torch.no_grad():  # Disable gradient computation for inference
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    do_sample=True if temperature > 0 else False,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    use_cache=False,  # Fix for Phi-3 compatibility issue
                    max_length=inputs['input_ids'].shape[1] + max_new_tokens  # Limit total length
                )
            
            # Decode output
            generated_text = self.tokenizer.decode(
                outputs[0], 
                skip_special_tokens=True
            )
            
            # Clear memory immediately after generation
            if self.device == "cuda":
                del inputs, outputs
                torch.cuda.empty_cache()
            
            # Better extraction - find where SOAP content actually starts
            if "<|assistant|>" in generated_text:
                # Extract everything after assistant tag
                generated_text = generated_text.split("<|assistant|>", 1)[-1].strip()
            elif prompt in generated_text:
                # Fallback: remove the prompt
                generated_text = generated_text.split(prompt, 1)[-1].strip()
            elif "- Subjective:" in generated_text:
                # Find where actual SOAP content starts
                start_idx = generated_text.find("- Subjective:")
                generated_text = generated_text[start_idx:].strip()
            
            # Clean up the output
            generated_text = self._clean_soap_output(generated_text)
            
            return generated_text
            
        except torch.cuda.OutOfMemoryError as e:
            error_msg = "GPU out of memory. Try reducing max_new_tokens or using CPU."
            logger.error(f"{error_msg}: {e}")
            raise RuntimeError(error_msg) from e
        except Exception as e:
            logger.error(f"Error during generation: {e}")
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
            "The patient said:"
        ]
        
        for line in lines:
            if stop_here:
                break
                
            line_stripped = line.strip()
            
            # Stop if we hit junk text markers
            if any(marker in line_stripped for marker in junk_markers):
                stop_here = True
                break
            
            # Check if this is a section header
            if line_stripped.startswith('- ') and ':' in line_stripped:
                section = line_stripped.split(':')[0].strip()
                if section not in seen_sections:
                    seen_sections.add(section)
                    cleaned_lines.append(line)
                # Skip duplicate headers
            elif line_stripped:
                cleaned_lines.append(line)
            elif cleaned_lines:  # Keep single blank lines between sections
                cleaned_lines.append('')
        
        # Join and clean up extra whitespace
        cleaned_text = '\n'.join(cleaned_lines)
        
        # Remove multiple consecutive blank lines
        cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
        
        # Final cleanup: remove any remaining junk text that might have slipped through
        for marker in junk_markers:
            if marker in cleaned_text:
                idx = cleaned_text.find(marker)
                cleaned_text = cleaned_text[:idx].strip()
                break
        
        return cleaned_text.strip()
    
    def is_initialized(self) -> bool:
        """Check if model is initialized."""
        return self._initialized


# Global instance (singleton pattern)
_nemotron_service: Optional[NemotronReasoningService] = None


def get_nemotron_service() -> NemotronReasoningService:
    """Get or create the global Nemotron service instance."""
    global _nemotron_service
    if _nemotron_service is None:
        _nemotron_service = NemotronReasoningService()
    return _nemotron_service


