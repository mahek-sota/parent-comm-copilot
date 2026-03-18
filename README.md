# Parent Communication Copilot

A production-style demo tool that converts structured classroom events into warm, professional parent messages. Teachers select a child, describe what happened (incident, daily update, behavior note, or reminder), choose a tone, and receive a polished, ready-to-send message in seconds — powered by Google Gemini AI. Built as a targeted demo for childcare platforms like Playground.

---

## Prerequisites

- Python 3.11+
- Node 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

---

## Local Setup

### 1. Clone and enter the project

```bash
cd parent-comm-copilot
```

### 2. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure your API key
cp ../.env.example .env
# Edit .env and set GEMINI_API_KEY=<your key>

# Start the API server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Editing CSV Data

All center data lives in `backend/data/` as plain CSV files — editable in Excel, Numbers, or any text editor.

| File | Contents |
|------|----------|
| `children.csv` | Child roster with classroom assignments, parent emails, and allergy notes |
| `classrooms.csv` | Classroom names and age groups |
| `teachers.csv` | Teacher roster with classroom assignments |
| `event_types.csv` | Available event categories and which fields they require |
| `incident_templates.csv` | Template messages used as LLM prompt examples |

Changes take effect immediately on the next API request (no restart needed when using `--reload`).

---

## Running Tests

### Backend (pytest)

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

All tests use `MockLLMClient` — no Gemini API key required.

### Frontend (Vitest)

```bash
cd frontend
npm test
```

---

## Project Structure

```
parent-comm-copilot/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, startup validation
│   ├── data_loader.py           # CSV → Pydantic models via pandas
│   ├── routers/
│   │   ├── children.py          # GET /children
│   │   ├── classrooms.py        # GET /classrooms
│   │   ├── events.py            # GET /events
│   │   └── generate.py          # POST /generate-message
│   ├── services/
│   │   ├── llm_client.py        # Abstract base class
│   │   ├── gemini_client.py     # Google Gemini implementation
│   │   └── mock_llm_client.py   # Deterministic test double
│   ├── models/schemas.py        # Pydantic request/response models
│   ├── data/                    # CSV data files
│   └── tests/test_api.py        # pytest test suite
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main dashboard shell
│   │   ├── api.js               # Fetch wrappers
│   │   └── components/
│   │       ├── ChildSelector    # Searchable child dropdown
│   │       ├── EventForm        # Dynamic event form
│   │       ├── ToneSelector     # Friendly / Professional / Brief pills
│   │       └── MessageOutput    # Result display with skeleton + copy
│   └── tests/App.test.jsx       # Vitest + React Testing Library suite
├── .env.example
└── README.md
```

---

## Known Limitations & Future Improvements

- **No persistence** — generated messages are not saved. A future version could store them in SQLite or Postgres.
- **Single-user** — no auth layer. Production use would require teacher login and per-classroom access controls.
- **CSV data store** — works well for demos but should be replaced with a proper database for production.
- **No message history** — teachers cannot review or resend past messages.
- **Gemini rate limits** — the app handles quota errors gracefully with a fallback message, but heavy usage would need retry logic or a request queue.
- **No email delivery** — messages are generated but must be copy-pasted manually. Integration with SendGrid or a childcare platform's messaging API is a natural next step.
