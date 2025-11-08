"""
Example script showing how to use the Nemotron reasoning service.
"""

import sys 
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.services.reasoning import get_nemotron_service


def main():
    """Example usage of Nemotron reasoning service."""
    
    # Get the service instance
    service = get_nemotron_service()
    
    # Initialize the model (will auto-detect GPU/CPU)
    print("Initializing Nemotron model...")
    service.initialize()
    
    # Example transcription
    transcript = """
    Patient reports feeling tired and having headaches for the past week. 
    They mention difficulty sleeping and feeling anxious about work deadlines.
    No fever or other symptoms reported.
    """
    
    # Example mood detection (you would get this from emotion detection)
    mood = "anxious"
    
    # Generate SOAP summary
    print("\nGenerating SOAP summary...")
    soap_summary = service.summarize_with_nemotron(
        transcript=transcript,
        mood=mood,
        max_new_tokens=250,
        temperature=0.7
    )
    
    print("\n" + "=" * 60)
    print("SOAP SUMMARY")
    print("=" * 60)
    print(soap_summary)
    print("=" * 60)


if __name__ == "__main__":
    main()


