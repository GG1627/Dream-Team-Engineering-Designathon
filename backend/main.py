from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import reasoning, pipeline


app = FastAPI(
    title="Dream Team Engineering Designathon API",
    description="Medical transcription and reasoning API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(reasoning.router)
app.include_router(pipeline.router)

@app.get("/")
def read_root():
    return {
        "message": "Dream Team Engineering Designathon API",
        "endpoints": {
            "reasoning": {
                "summarize": "/reasoning/summarize",
                "health": "/reasoning/health"
            },
            "pipeline": {
                "audio_to_soap": "/pipeline/audio-to-soap",
                "transcript_to_soap": "/pipeline/transcript-to-soap",
                "health": "/pipeline/health"
            }
        }
    }