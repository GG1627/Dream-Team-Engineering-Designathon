import requests
import json

response = requests.post(
    "http://localhost:8000/pipeline/transcript-to-soap",
    json={
        "transcript": "Patient reports feeling tired and having headaches for the past week. They mention difficulty sleeping and feeling anxious about work deadlines.",
        "mood": "anxious"
    }
)

print(json.dumps(response.json(), indent=2))