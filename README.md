# AIVOA Complaint Management System

An AI-powered Customer Complaint Management System for pharmaceutical QMS (API & FDF manufacturing), built for the AIVOA Round 1 Full Stack Developer Assessment.

## Overview

This app lets a QA user log, edit, and manage pharmaceutical customer complaints entirely through a conversational AI Copilot — the complaint form itself is never filled manually. The AI extracts structured data from free text or uploaded PDFs, reasons about severity and risk, and flags potential duplicate complaints before they're committed to the database.

## Tech Stack

- **Frontend**: React + Redux Toolkit, Google Inter font
- **Backend**: Python + FastAPI
- **AI**: Groq (llama-3.1-8b-instant, llama-3.3-70b-versatile) — see Model Note below
- **Database**: PostgreSQL (hosted on Neon)

## AI Features Implemented

1. **Log Complaint** — paste free text describing a complaint; AI extracts structured fields (product, batch, dates, etc.) and generates an initial risk assessment (severity, suggested next action).
2. **Edit Complaint** — send a natural-language correction (e.g. "sorry, the batch number is X"); AI updates only the mentioned fields, preserving everything else.
3. **Document Extraction** — upload a PDF complaint report; AI extracts text and populates the form the same way as the Log Complaint tool.
4. **Duplicate Complaint Detection** (bonus) — before committing a new complaint, the AI compares it against existing records and warns the user if a likely duplicate is found.

## Model Note

The assignment specifies `gemma2-9b-it`. This model was decommissioned by Groq shortly before this assessment was completed, in favor of `llama-3.1-8b-instant` (Groq's official recommended replacement — same speed tier, comparable price-performance). All lightweight extraction/edit/duplicate-check tasks use `llama-3.1-8b-instant`; `llama-3.3-70b-versatile` is available for heavier reasoning tasks per the assignment's suggestion.

## Project Structure
aivoa-complaint-system/
├── backend/
│ ├── main.py # FastAPI app & endpoints
│ ├── ai_agent.py # AI extraction, edit, and duplicate-check logic
│ ├── models.py # SQLAlchemy database models
│ ├── schemas.py # Pydantic request/response schemas
│ ├── database.py # DB connection setup
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ │ ├── ComplaintForm.jsx # Left panel — complaint form (read-only, AI-filled)
│ │ │ └── CopilotChat.jsx # Right panel — AI chat interface
│ │ ├── store/
│ │ │ ├── store.js
│ │ │ └── complaintSlice.js # Redux state for the current complaint
## Setup & Running Locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv pydantic langgraph langchain-groq pypdf python-multipart
```

Create a `.env` file in `backend/` with:
DATABASE_URL=your_database_url
GROQ_API_KEY=your_api_key

Run:
```bash
uvicorn main:app --reload
```
Backend runs at `http://127.0.0.1:8000` (interactive docs at `/docs`).

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

## Design Decisions

- **Form is read-only by design** — all fields are populated exclusively through the AI Copilot, per the assignment's explicit requirement.
- **Redux holds the single source of truth** for the current complaint being worked on; the AI's responses merge into this state, letting both the form and chat stay in sync without prop drilling.
- **Edit vs. Log routing** — the frontend decides which endpoint to call based on whether a complaint is already in progress (`product_name` is set), matching the demo's behavior where corrections only affect the active complaint.
- **Dates stored as free text** rather than strict date types, since complaint documents often provide partial dates (e.g. "March 2026") that don't fit rigid date formats.