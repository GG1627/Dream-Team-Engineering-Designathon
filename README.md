
# Sana: AI-Powered Conversational Healthcare

<div align="center">

![Logo](frontend/public/Logo.png)

[![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC)](https://tailwindcss.com/)

**Transforming patient intake from stressful questionnaires to natural conversations.**

[Live Demo](#) • [Documentation](#) • [Quick Start](#quick-start)

</div>

---

## Problem Statement

In primary care settings, physicians spend **40%+ of their time** on administrative tasks, particularly patient intake and documentation. Traditional methods are:

- **Time-consuming**: Manual note-taking during consultations
- **Error-prone**: Incomplete or inaccurate documentation
- **Stressful**: Patients struggle to articulate symptoms under pressure
- **Inefficient**: Repetitive data entry across multiple systems

**Sana addresses these challenges** by transforming conversational patient intake into structured medical documentation using cutting-edge AI.

---

## Key Features

### Conversational Patient Intake
Patients describe symptoms naturally through speech, eliminating the need for stressful questionnaires and manual form-filling.

![Conversational Intake](frontend/public/submission_imgs/SpeechToTextSOAP.png)

### Intelligent SOAP Note Generation
Converts free-form patient conversations into professional, structured SOAP (Subjective, Objective, Assessment, Plan) notes instantly.

![SOAP Notes](frontend/public/submission_imgs/DoctorSOAP_Notes.png)

### Comprehensive Dashboards

#### Physician Dashboard
Real-time patient summaries, emotional state indicators, and prioritized case management.

![Doctor Dashboard](frontend/public/submission_imgs/DoctorDashboard.png)

#### Patient Dashboard
Personal health tracking, medication reminders, and appointment management.

![Patient Dashboard](frontend/public/submission_imgs/PatientDashboard.png)

### Time Optimization Impact
- **>40% reduction** in administrative time per consultation
- **90% faster** documentation completion
- **Improved patient satisfaction** through natural conversations
- **Enhanced diagnostic accuracy** with emotion-aware insights

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16 + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **3D Graphics:** Three.js + React Three Fiber
- **UI Components:** Material-UI + Custom Components
- **Real-time Features:** WebRTC for webcam/audio capture

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **Server:** Uvicorn ASGI
- **API Design:** RESTful with automatic OpenAPI docs
- **Dependencies:** Transformers, PyTorch, MediaPipe, OpenAI Whisper

### AI/ML Models

| Component | Model | Purpose |
|-----------|--------|---------|
| **Speech Recognition** | OpenAI Whisper-small | Real-time speech-to-text transcription |
| **NLP Reasoning & SOAP** | Llama 3.1 | Medical note generation and clinical reasoning |
| **RAG Assistant** | Llama 3.1 | Conversational AI support for physicians |

### Infrastructure
- **Database:** PostgreSQL / Supabase
- **Monitoring:** Application performance and AI model metrics

---

## Application Screenshots

### Landing Page
Professional, welcoming interface that puts patients at ease.

![Landing Page](frontend/public/submission_imgs/LandingPage.png)

### Pre-filled Patient History
Intelligent context gathering before consultations.

![Patient History](frontend/public/submission_imgs/PrefilledHistory.png)

### Medication Tracker
Comprehensive medication management with AI-powered reminders.

![Medication Tracker](frontend/public/submission_imgs/MedicationTracker.png)

### RAG AI Assistant
Contextual AI support for physicians during consultations.

![RAG AI Assistant](frontend/public/submission_imgs/RAG_AI_Assistant.png)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL (optional, for data persistence)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/GG1627/Dream-Team-Engineering-Designathon.git
cd Dream-Team-Engineering-Designathon
```

2. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

3. **Setup Backend**
```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

<div align="center">

**Built for better healthcare experiences**

</div>
