
---

## 🧩 Core Features

| Feature | Description | AI / Tech Used |
|----------|--------------|----------------|
| 🎙️ **Conversational Intake** | Patients describe symptoms naturally; system records and transcribes speech. | Whisper-small / Hugging Face ASR |
| 🧍 **Emotion Detection** | Detect facial expressions and tone to estimate pain, anxiety, or confusion. | MediaPipe FaceMesh + FER+ / NVIDIA Cosmos |
| 💬 **Intelligent Summarization** | Convert free-form speech into concise doctor-ready notes (SOAP format). | NVIDIA Nemotron-mini / T5-base |
| 🩹 **Predictive Flagging** | Identify urgent or complex cases automatically. | TabPFN-2.5 |
| 📊 **Doctor Dashboard** | Displays structured patient summaries and emotional state. | Next.js UI |
| 🕐 **Time Optimization** | Reduces intake and note-taking time by >40%. | Combined pipeline |

---

## 🧰 Tech Stack

### 🖥️ Frontend
- **Framework:** Next.js 14 + React 18  
- **Styling:** Tailwind CSS  
- **Features:**  
  - Webcam & mic capture via WebRTC  
  - Live progress feedback  
  - Doctor dashboard view  

### ⚙️ Backend
- **Framework:** FastAPI (Python 3.10+)  
- **Server:** Uvicorn  
- **Dependencies:** `transformers`, `torch`, `mediapipe`, `openai-whisper`, `pydantic`, `requests`

### 🤖 AI Models
| Task | Model | Source |
|------|--------|--------|
| Speech-to-Text | `openai/whisper-small` | Hugging Face / OpenAI |
| Emotion Detection | `mediapipe.face_mesh`, `microsoft/ferplus` | Google / Microsoft |
| NLP Summarization | `nvidia/nemotron-4-mini` / `t5-base` | NVIDIA / Hugging Face |
| Sentiment Analysis | `cardiffnlp/twitter-roberta-base-sentiment` | Hugging Face |
| Predictive Insights | `TabPFN-2.5` | Hugging Face |

### 🗄️ Database (Optional)
- PostgreSQL / Supabase  
- Used for storing patient summaries, timestamps, and analytics.

---

## 📁 Repository Structure

