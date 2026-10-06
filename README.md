# MathSim
**Grid test digitization and automatic grading application**

MathSim transforms a static PDF containing nearly 1000 math grids into an interactive web platform for exam simulations, automatic grading, and progress tracking.

## Architecture

```
Frontend (Next.js)  ──REST──▶  Backend (FastAPI)
    port 3000                    port 8000
```

Two independent components communicating through a well-defined API:

- **CV Pipeline** — runs once, produces grid images and the answer key, then stops
- **FastAPI Backend** — handles authentication, simulations, grading, and statistics
- **Next.js Frontend** — the web interface; never touches files or the database directly

The local stack runs in Docker Compose: frontend, backend, and PostgreSQL.
Tests use a separate, temporary PostgreSQL container.

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

## Project Structure

```text
MathSim/
├── backend/                # FastAPI (Auth, Simulations)
│   ├── routers/            # auth, simulation, admin
│   ├── services/           # Business logic
│   └── tests/              # pytest against isolated PostgreSQL
├── frontend/               # Next.js 16 (App Router, Tailwind CSS)
│   └── src/
│       ├── app/            # Pages (student, admin, auth)
│       ├── components/     # Navbar, DataTable, AuthForm
│       ├── hooks/          # useAuth, useUserStats, useChapters
│       └── lib/            # API client, auth, constants
├── pipeline/               # CV Pipeline (offline)
│   └── src/                # pdf2image, segmenter, indexer, answers, validator
├── data/                   # Local offline pipeline inputs and outputs
├── docker-compose.yml      # Local stack + isolated test profile
└── .env.example            # Environment variable template
```

## Installation

### Docker (recommended)

Copy `.env.example` only if you do not already have `.env`. For an existing
file, replace the obsolete `DATABASE_PATH` setting with the `DATABASE_URL` and
`POSTGRES_PASSWORD` values from the example; preserve your other settings.
The example credentials are for local Docker only. If changing the password,
update both settings and URL-encode special characters in the connection URL.

```bash
cp .env.example .env

# Generate a JWT signing key, then set SECRET_KEY in .env to the output
docker run --rm python:3.12-slim python -c "import secrets; print(secrets.token_hex(32))"

docker compose up -d postgres

# Initialize the schema once, before starting the application
docker compose run --rm --build backend python init_db.py
docker compose up -d --build
```

Access: **Frontend** `http://localhost:3000` | **Backend API** `http://localhost:8000`

PostgreSQL runs on the internal Docker network and is not exposed on a host
port. The `postgres_data` volume preserves local data between restarts.
`docker compose down` preserves it; **`docker compose down -v` deletes it**.
There is no SQLite fallback or data transfer from the old SQLite database.
PostgreSQL starts empty, and application startup never creates tables.

`SECRET_KEY` is mandatory: the backend refuses to start if it is blank or
shorter than 32 characters. Use the random generator above, not a password or
an example value. Keep the key stable across restarts; changing it invalidates
existing JWTs and users must log in again. For an existing `.env`, replace
the old `secret_key` value before starting the backend.

### Offline Pipeline

```bash
cd pipeline && pip install -r requirements.txt && python run.py --clean --all
```

### Tests

From the repository root, with `.env` configured as above:

```bash
docker compose --profile test run --rm --build tests

# Remove only the test containers; leave the application's data alone
docker compose --profile test rm --stop --force postgres-test
```

The test image installs `backend/requirements-test.txt`. Tests use a separate
PostgreSQL service (`postgres-test`), credentials and database (`mathsim_test`),
an internal network with no public ports, and temporary in-memory storage.
The application database and Neon are never used by this profile.
Its fixed JWT signing key is for tests only; never use it for deployment.

`TEST_DATABASE_URL` is mandatory. Fixtures reject URLs that do not target the
isolated `postgres-test/mathsim_test` service before importing the application
or connecting, then create/drop tables only in that test database. These checks
deliberately restrict the suite to the Compose test environment.

### PostgreSQL / Neon (deployment)

Set `DATABASE_URL` in the **backend** environment to Neon's pooled PostgreSQL
connection URL. Keep the supplied SSL query parameters; both `postgresql://`
and `postgres://` URLs are accepted. Never expose it through a `NEXT_PUBLIC_*`
variable or commit credentials.

Install `backend/requirements.txt`, then initialize the tables once before
deploying the backend:

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST-pooler/DATABASE?sslmode=require'
python backend/init_db.py
```

PostgreSQL uses the external connection pool, with no persistent pool inside
the function. Application startup does not create PostgreSQL tables. The
initialization script creates missing tables; it does not alter existing
schemas. Future model changes require an explicit schema migration.
A missing/empty `DATABASE_URL` or a non-PostgreSQL URL prevents startup.

Set a separately generated `SECRET_KEY` in the **Vercel backend** environment,
using the same generator as for local Docker. Keep it out of source control and
`NEXT_PUBLIC_*` variables. Protected user/statistics endpoints enforce access
on the backend; frontend redirects are only a UX convenience.

## Performance & Testing

| Metric | Value |
|--------|-------|
| Grid segmentation | **100%** (959/959) |
| Answer key extraction | **98%** (19 out of 959 entries missing, 8 of which omitted in source) |
| Automated tests | `backend/tests/` — pytest against PostgreSQL |
| API latency (100 concurrent clients) | **~12.5 ms** average (Locust) |
| Parallelization speedup | **7.2×** (8.7s on 8 cores vs 62.9s sequential) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| CV / OCR | Python 3.12, OpenCV, Tesseract, PyMuPDF |
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts |
| Infrastructure | Docker, Docker Compose |
