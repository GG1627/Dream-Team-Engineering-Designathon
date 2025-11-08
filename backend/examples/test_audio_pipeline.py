"""
Test script to record audio and generate SOAP notes.
Speak into your microphone and see the full pipeline in action!
"""

import sys
import os
import tempfile

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.services.pipeline import get_pipeline_service
from backend.services.transcription import get_transcription_service

def test_audio_to_soap():
    """Record audio and generate SOAP notes."""
    
    print("=" * 60)
    print("AUDIO TO SOAP PIPELINE TEST")
    print("=" * 60)
    print()
    
    # Get services
    pipeline = get_pipeline_service()
    transcription = get_transcription_service()
    
    # Initialize transcription service (for recording)
    print("Initializing transcription service...")
    transcription.initialize()
    print("✓ Ready to record\n")
    
    # Get recording duration
    print("How long would you like to record? (seconds, default: 10)")
    try:
        duration = input("Duration: ").strip()
        duration = float(duration) if duration else 10.0
    except ValueError:
        duration = 10.0
        print(f"Invalid input, using default: {duration}s")
    
    # Create temp file for recording
    temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    temp_audio_path = temp_audio_file.name
    temp_audio_file.close()
    
    try:
        # Record audio
        print(f"\n{'=' * 60}")
        print(f"🎤 Recording for {duration} seconds...")
        print("   Speak now! (describe your symptoms)")
        print(f"{'=' * 60}\n")
        
        transcription.record_chunk(temp_audio_path, chunk_length=duration)
        
        print("✓ Recording complete!\n")
        
        # Process through pipeline
        print("=" * 60)
        print("Processing audio through pipeline...")
        print("  → Transcribing...")
        print("  → Generating SOAP notes...")
        print("=" * 60)
        print()
        
        result = pipeline.process_audio_to_soap(
            audio_file_path=temp_audio_path,
            mood=None,  # You can add mood detection here later
            language="en"
        )
        
        # Display results
        print("\n" + "=" * 60)
        print("TRANSCRIPT")
        print("=" * 60)
        print(result["transcript"])
        print()
        
        print("=" * 60)
        print("SOAP SUMMARY")
        print("=" * 60)
        print(result["soap_summary"])
        print("=" * 60)
        
        # Show transcription info
        if result.get("transcription_info"):
            info = result["transcription_info"]
            print(f"\nLanguage: {info.get('language', 'unknown').upper()}")
            print(f"Confidence: {info.get('language_probability', 0):.2%}")
            print(f"Segments: {len(info.get('segments', []))}")
        
    except KeyboardInterrupt:
        print("\n\nRecording cancelled by user.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up temp file
        if os.path.exists(temp_audio_path):
            try:
                os.unlink(temp_audio_path)
            except:
                pass

if __name__ == "__main__":
    test_audio_to_soap()