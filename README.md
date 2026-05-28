# MathSim
**Full-Stack Math Simulation Platform & Automated Digitization Pipeline**

MathSim is an integrated solution for digitizing mathematical collections (UTCN) and providing a modern, interactive web platform for exam simulations. It combines a high-precision Computer Vision pipeline with a robust Next.js/FastAPI web application.

## Key Features

### Web Platform
- **JWT Authentication**: Secure login with bcrypt password hashing and token-based sessions.
- **Smart Simulations**: Generate custom tests with weighted chapters (Algebra, Analysis, Geometry, Trigonometry, Admission).
- **Interactive Timer**: Countdown functionality with visual alerts and automated submission upon expiry.
- **Admin Dashboard**: Comprehensive user management (pagination, promote/delete) and dynamic statistics visualized with Recharts.
- **AI Integration**: Built-in AI assistant (Ollama) to help students with grid-specific questions.
- **Account Management**: Self-service account deletion, toast notifications, dark mode.
- **Server-Side Route Protection**: Next.js middleware with JWT cookie verification.

### Backend
- **Modular Architecture**: Routers (auth, simulation, admin, ai, grids) + services + schemas + dependencies.
- **Database-Backed Sessions**: Simulation sessions persisted in SQLite (survive server restart).
- **Secure Session IDs**: Cryptographically random tokens via `secrets.token_hex`.
- **Inventory Caching**: Filesystem scan cached for 1 hour, avoiding disk I/O on every request.
- **Pagination**: `/api/users` supports `?limit=50&offset=0` with aggregate queries.
- **Database Indexes**: Optimized queries on `user_id` and `created_at`.

### Digitization Pipeline (CV)
- **Contour-Based Segmentation**: Precise geometric extraction of mathematical grids using OpenCV.
- **Sequence-Aware OCR**: Robust voting algorithm ensuring 100% numbering accuracy (959/959 grids).
- **Parallel Processing**: Multi-core with worker pool capped at 8 to prevent OOM.
- **Automated Answer Mapping**: Extraction of answer keys from dense tabular PDF data.
- **Validation Reports**: `missing_grile.txt` generated per chapter.
- **OCR Error Logging**: Errors written to `logs/errors.log` with page/circle context.

### Testing
- **26 Backend Tests**: 20 API integration tests + 6 unit tests for grading logic (pytest).

## Project Structure

```text
MathSim/
├── backend/                # FastAPI service (Auth, Simulations, AI proxy)
│   ├── routers/            # API route handlers (auth, simulation, admin, ai, grids)
│   ├── services/           # Business logic (simulation engine)
│   ├── tests/              # pytest integration and unit tests
│   └── Dockerfile          # Python 3.12 container (non-root user)
├── frontend/               # Next.js 16 application (Standalone optimized)
│   ├── src/
│   │   ├── app/            # Pages (admin, student, login, register)
│   │   ├── components/     # Reusable components (Navbar, DataTable, AuthForm, Toast)
│   │   ├── hooks/          # Custom hooks (useAuth, useUserStats, useChapters)
│   │   └── lib/            # API client, auth utilities, constants
│   └── Dockerfile          # Multi-stage Node.js 20 container (non-root user)
├── pipeline/               # CV Pipeline (Segmentation & OCR Digitization)
│   └── src/                # pdf2image, segmenter, indexer, answers, validator
├── data/                   # Persistent volume (SQLite DB, processed grids, answers)
│   ├── raw/                # Source PDF
│   ├── temp/               # Intermediate processing artifacts
│   └── processed/          # Indexed grids per chapter + final_answers.json
├── docs/                   # Project documentation and audit
├── .env.example            # Environment variable template
├── docker-compose.yml      # Service orchestration (FE, BE, Ollama)
└── README.md
```

## Installation & Setup

### Docker (Recommended)
```bash
# 1. Copy environment config
cp .env.example .env

# 2. Start all services
docker compose up -d

# 3. Pull the AI model (one-time)
docker exec mathsim-ollama-1 ollama pull llama3.2:1b

# 4. Access the platform
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

### Local Development

> **Note:** If you move or rename the project directory, recreate the virtual environment:
> ```bash
> rm -rf venv && python3 -m venv venv
> pip install -r backend/requirements.txt -r pipeline/requirements.txt
> ```

#### Backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env
python main.py
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Digitization Pipeline
```bash
cd pipeline
pip install -r requirements.txt

# Full run (clean previous data + all 5 steps)
python run.py --clean --all

# Or individual steps
python run.py --step 1    # PDF → Images
python run.py --step 2    # Segmentation
python run.py --step 3    # OCR Indexing
python run.py --step 4    # Answer Extraction
python run.py --step 5    # Validation
```

#### Running Tests
```bash
pytest backend/tests/ -v
```

## Results Summary
- **Grid Segmentation**: 100% (959/959 grids identified).
- **Answer Key Accuracy**: 98.8% automated extraction.
- **Test Coverage**: 26 backend tests (all passing).
- **Parallel Processing**: 7.2x speedup via multi-core pipeline.
- **Architecture**: Next.js 16 Standalone + FastAPI modular backend.
