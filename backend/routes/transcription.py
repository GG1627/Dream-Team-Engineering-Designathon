"""
Transcription route/script - uses TranscriptionService for the actual work.
Can be run as a standalone script or integrated into API routes.
"""

import os
import sys
import time
from backend.services.transcription import get_transcription_service


def main():
    """Main function for optimized audio transcription."""
    print("=" * 60)
    print("Optimized Whisper Transcription")
    print("=" * 60)
    
    # Get transcription service
    service = get_transcription_service(model_size="base")
    
    # Initialize the model
    print("Initializing Whisper model...")
    service.initialize()
    
    print(f"Using device: {service.device}, compute_type: {service.compute_type}")
    print(f"Chunk length: {service.chunk_length}s, Beam size: {service.beam_size}")
    
    if service.device == "cuda":
        print("Starting GPU-accelerated transcription...")
    else:
        print("Starting CPU transcription...")
    
    print("Press Ctrl+C to stop\n")
    
    # List available input devices
    print("Available input devices:")
    devices = service.get_available_devices()
    for device in devices:
        print(f"  [{device['index']}] {device['name']} ({device['channels']} channels)")
    print()
    
    # Set default input device
    service.set_input_device(0)  # Change 0 to your preferred device index
    
    # Test microphone before starting
    if not service.test_microphone():
        print("\nWarning: Microphone test failed. Please check your microphone settings.")
        print("You can continue anyway, but transcription may not work.\n")
    
    accumulated_transcription = ""
    chunk_file = "temp_chunk.wav"
    chunk_count = 0
    total_transcription_time = 0
    
    print(f"Listening... (speak into your microphone, {service.chunk_length}-second chunks)\n")
    
    try:
        while True:
            chunk_count += 1
            
            # Record audio chunk
            print(f"[Chunk {chunk_count}] Recording...", end="", flush=True)
            service.record_chunk(chunk_file)
            
            # Transcribe using the service
            print(f" Transcribing...", end="", flush=True)
            chunk_text, info, transcribe_time = service.transcribe_chunk(chunk_file)
            
            total_transcription_time += transcribe_time
            
            # Print results with timing info
            if chunk_text.strip():
                avg_time = total_transcription_time / chunk_count
                segment_count = len(info.get("segments", []))
                print(f" ✓ ({transcribe_time:.2f}s, avg: {avg_time:.2f}s)")
                print(f"[{info['language'].upper()}] {chunk_text}")
                print(f"  Confidence: {info['language_probability']:.2%} | Segments: {segment_count}\n")
                accumulated_transcription += chunk_text + " "
            else:
                print(f" (no speech detected, {transcribe_time:.2f}s)\n", flush=True)
            
            # Clean up temp file
            if os.path.exists(chunk_file):
                try:
                    os.remove(chunk_file)
                except:
                    pass  # Ignore deletion errors
                
    except KeyboardInterrupt:
        print("\n\n" + "=" * 60)
        print("Stopping transcription...")
        print("=" * 60)
        if accumulated_transcription.strip():
            print(f"\nFull transcription ({chunk_count} chunks processed):")
            print("-" * 60)
            print(accumulated_transcription.strip())
            print("-" * 60)
            if chunk_count > 0:
                print(f"\nAverage transcription time: {total_transcription_time/chunk_count:.2f}s per chunk")
        else:
            print("\nNo transcription captured.")
    except Exception as e:
        print(f"\n\nError occurred: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        if os.path.exists(chunk_file):
            try:
                os.remove(chunk_file)
            except:
                pass
        print("\nCleanup complete.")


if __name__ == "__main__":
    main()