# Nemotron Reasoning Service

This service uses NVIDIA Nemotron-4-340M-Instruct to convert medical transcriptions into SOAP format summaries.

## Setup

1. **Install dependencies:**
   ```bash
   pip install transformers torch accelerate
   ```

2. **The model will automatically download on first use** from Hugging Face.

## Usage

### As a Service (Python)

```python
from backend.services.reasoning import get_nemotron_service

service = get_nemotron_service()
service.initialize()

soap_summary = service.summarize_with_nemotron(
    transcript="Patient reports headaches and fatigue...",
    mood="anxious",
    max_new_tokens=250
)
```

### Via API (FastAPI)

Start the server:
```bash
uvicorn backend.main:app --reload
```

Then make a POST request:
```bash
curl -X POST "http://localhost:8000/reasoning/summarize" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Patient reports headaches...",
    "mood": "anxious",
    "max_new_tokens": 250
  }'
```

## API Endpoints

- `POST /reasoning/summarize` - Generate SOAP summary
- `GET /reasoning/health` - Check service status

## Integration with Transcription

You can integrate this with the transcription service:

```python
# After getting transcription
transcript = "Patient said: I have been feeling tired..."

# Generate SOAP summary
from backend.services.reasoning import get_nemotron_service
service = get_nemotron_service()
soap = service.summarize_with_nemotron(transcript, mood="neutral")
```

## Model Details

- **Model**: nvidia/Nemotron-4-340M-Instruct
- **Device**: Auto-detects GPU (CUDA) or falls back to CPU
- **Precision**: float16 on GPU, float32 on CPU


