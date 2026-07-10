# MathSim
**Grid test digitization and automatic grading application**

MathSim transforms a static PDF containing nearly 1000 math grids into an interactive web platform for exam simulations, automatic grading, and progress tracking.

## Architecture

```
Frontend (Next.js)  ──REST/SSE──▶  Backend (FastAPI)  ──HTTP──▶  Ollama (local LLM)
    port 3000                          port 8000                     port 11434
```

Three independent components communicating through well-defined APIs:

- **CV Pipeline** — runs once, produces grid images and the answer key, then stops
- **FastAPI Backend** — handles authentication, simulations, grading, statistics, and LLM proxy
- **Next.js Frontend** — the web interface; never touches files or the database directly

Fully containerized via Docker Compose (3 containers) with healthchecks and resource limits.

## Key Features

### Digitization Pipeline
- **Contour-based segmentation** — grid extraction from PDF using Suzuki-Abe contour detection and the original *Contour Masking* technique, which preserves the exact shape of each grid (circle + rectangle) rather than a rough bounding box
- **Page Sequence Voting** — original algorithm that exploits consecutive grid numbering to correct OCR errors without manual validation; achieves 100% accuracy (959/959 grids)
- **Automated answer key extraction** — processes 4 ultra-dense pages (~240 answers/page, 6 columns) using morphological dilation with interval validation (*Ghost Digit Cleanup*, *Page Range Validation*)
- **CPU parallelization** — multi-core processing with zero synchronization overhead; 7.2× speedup over sequential mode (8.7s vs 62.9s for 142 pages)

### Web Platform
- **Secure authentication** — JWT + bcrypt, two roles (student, admin), 8-hour token expiry
- **Custom simulations** — weighted grid selection by chapter (Algebra, Analysis, Geometry, Trigonometry, Admission), proportional distribution, no duplicates, every session is unique
- **Interactive quiz** — countdown timer, auto-submit on expiry, free navigation between grids, double navigation guard to prevent accidental exit
- **Automatic grading** — 0–10 scale with per-grid breakdown (submitted answer, expected answer, correct/wrong status)
- **Learning analytics** — time-based progress chart (LineChart), per-chapter accuracy bars, period filters (7/30/90/180 days)
- **Admin panel** — global statistics, weekly activity, per-chapter distribution, user management (promote/delete)
- **Grid preview** — from the results page, any wrong answer can be visually inspected to see the original grid image

### AI Assistant
- **Local LLM** — `llama3.2:1b` running through Ollama, no API costs, no internet dependency
- **Personalized context** — prompts include the student's real statistics (average score, per-chapter accuracy, history)
- **SSE streaming** — responses streamed token-by-token via Server-Sent Events for an interactive experience

## Project Structure

```text
MathSim/
├── backend/                # FastAPI (Auth, Simulations, AI proxy)
│   ├── routers/            # auth, simulation, admin, ai, grids
│   ├── services/           # Business logic
│   └── tests/              # 26 tests (pytest)
├── frontend/               # Next.js 16 (App Router, Tailwind CSS)
│   └── src/
│       ├── app/            # Pages (student, admin, auth)
│       ├── components/     # Navbar, DataTable, AuthForm, AIChat
│       ├── hooks/          # useAuth, useUserStats, useChapters
│       └── lib/            # API client, auth, constants
├── pipeline/               # CV Pipeline (offline)
│   └── src/                # pdf2image, segmenter, indexer, answers, validator
├── data/                   # Persistent data (SQLite DB, grids, answer key)
├── docker-compose.yml      # Orchestrator (3 services + Ollama volume)
└── .env.example            # Environment variable template
```

## Installation

### Docker (recommended)

```bash
cp .env.example .env
docker compose up -d

# Pull the AI model (one-time)
docker exec mathsim-ollama-1 ollama pull llama3.2:1b
```

Access: **Frontend** `http://localhost:3000` | **Backend API** `http://localhost:8000`

### Local Development

```bash
# Backend
cd backend && pip install -r requirements.txt && python main.py

# Frontend
cd frontend && npm install && npm run dev

# Pipeline
cd pipeline && pip install -r requirements.txt && python run.py --clean --all

# Tests
pytest backend/tests/ -v
```

## Performance & Testing

| Metric | Value |
|--------|-------|
| Grid segmentation | **100%** (959/959) |
| Answer key extraction | **98%** (19 out of 959 entries missing, 8 of which omitted in source) |
| Automated tests | **26** (Pytest, all passing) |
| API latency (100 concurrent clients) | **~12.5 ms** average (Locust) |
| Parallelization speedup | **7.2×** (8.7s on 8 cores vs 62.9s sequential) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| CV / OCR | Python 3.12, OpenCV, Tesseract, PyMuPDF |
| Backend | FastAPI, SQLAlchemy, SQLite |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts |
| Infrastructure | Docker, Docker Compose |
| AI | Ollama + llama3.2:1b (1B params) |
