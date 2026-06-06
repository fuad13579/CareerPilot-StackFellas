# CareerPilot Backend

FastAPI backend for CareerPilot, the StackFellas CodeSprint 2026 project.

## Overview

The backend is responsible for:
- CV upload and text extraction
- section chunking and local RAG preparation
- live job search aggregation
- fit score calculation
- assistant and cover letter generation
- tracker, todo, and calendar persistence
- anonymous user scoping via `x-careerpilot-user-id`

The current deployment model is:
- backend on an Azure Ubuntu VM
- frontend on Vercel
- frontend API routes proxying to the backend through `BACKEND_URL`

## Stack

- FastAPI
- Uvicorn
- SQLAlchemy
- SQLite
- Pydantic
- python-multipart
- pypdf
- python-docx
- sentence-transformers
- scikit-learn
- numpy
- httpx
- python-dotenv
- pytest

## Requirements

- Python `3.11`
- `pip`
- virtual environment support

Install dependencies:

```bash
pip install -r requirements.txt
```

## Local Setup

From the repo root:

```bash
cd backend
python3.11 -m venv .venv
```

Activate the environment:

```powershell
.venv\Scripts\Activate.ps1
```

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

Create env file:

```bash
cp .env.example .env
```

## Environment Variables

All backend configuration lives in `backend/.env`.

Important variables:

| Variable | Purpose |
| --- | --- |
| `GITHUB_MODELS_TOKEN` | Primary hosted LLM provider token |
| `GITHUB_MODELS_MODEL` | GitHub Models model id |
| `OPENROUTER_API_KEY` | Fallback hosted LLM provider |
| `OPENROUTER_MODEL` | OpenRouter model id |
| `OPENROUTER_APP_NAME` | Optional OpenRouter analytics label |
| `OPENROUTER_APP_URL` | Optional OpenRouter referer |
| `ADZUNA_APP_ID` | Adzuna job API id |
| `ADZUNA_APP_KEY` | Adzuna job API key |
| `ADZUNA_COUNTRY` | Adzuna country code, default `us` |
| `CORS_ORIGINS` | Allowed browser origins |
| `JOB_CACHE_TTL_SECONDS` | Live job cache TTL override |
| `INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE` | Include extracted CV text in upload response |

The app still works without hosted model keys. In that case it falls back to built-in CV-grounded logic.

## FastAPI Entrypoint

The backend entrypoint is:

```text
app.main:app
```

Manual local run:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Production-style run:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Health Routes

Available health endpoints:

- `/health`
- `/api/health`
- `/api/health/providers`

Examples:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/health/providers
```

## API Docs

When the backend is running locally:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Storage Model

The backend currently uses local persistent storage under `backend/app/storage`.

Key paths:
- SQLite database: `backend/app/storage/careerpilot.db`
- uploaded CVs: `backend/app/storage/uploaded_cvs`
- processed CV text and section files: `backend/app/storage/processed_cvs`
- vector data: `backend/app/storage/vector_db`

This is suitable for demo deployment on a persistent VM, but not ideal for production-grade multi-user scale.

## Core Flows

### CV Upload

1. Frontend sends `POST /api/cv/upload`
2. Backend validates file type and size
3. Text is extracted from PDF or DOCX
4. Text is split into sections
5. Skills are extracted
6. Processed text and sections are saved locally
7. Vector index is built for later retrieval

### RAG and Assistant

1. User uploads CV
2. CV sections are chunked and indexed locally
3. Assistant query retrieves relevant CV chunks
4. If available, hosted LLM provider is used
5. Otherwise, built-in fallback response logic is used

### Job Search and Fit Score

1. Backend fans out to supported job sources
2. Results are normalized and deduplicated
3. Required skills are extracted from job content
4. CV skills are compared against job skills
5. Fit score and matched or missing skill sets are returned

### Tracker and Productivity

Applications, todos, calendar events, and assistant sessions are persisted in SQLite and scoped by anonymous user id.

## Anonymous User Model

This backend is intentionally demo-first and does not require login.

Each request is scoped using:

- `x-careerpilot-user-id`

The frontend generates and persists that identifier in browser storage. Backend routes validate that id before reading or writing user-specific records.

Implication:
- clearing browser storage resets the local profile
- there is no cross-device sync yet

## Testing

Run backend tests:

```bash
cd backend
pytest -q
```

Useful targeted test:

```bash
pytest backend/tests/test_job_search.py -q
```

## Deployment Notes

### Current Demo Deployment

Current demo architecture:
- backend hosted on Azure Ubuntu VM
- `uvicorn` managed by `systemd`
- `nginx` reverse-proxying port `80` to `127.0.0.1:8000`
- frontend hosted on Vercel

Public health check currently used in deployment:

```text
http://104.211.90.209/health
```

### Azure VM Service Pattern

Typical service command:

```text
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Typical checks on the VM:

```bash
sudo systemctl status careerpilot-backend
sudo systemctl status nginx
curl http://127.0.0.1:8000/health
curl http://127.0.0.1/health
```

### If You Change Backend Code

For the current Azure VM deployment flow:

```bash
cd ~/CareerPilot-StackFellas
git pull
cd backend
source .venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart careerpilot-backend
```

## Known Limitations

- local filesystem persistence instead of object storage
- SQLite instead of a production database
- anonymous browser identity instead of full authentication
- hosted LLM behavior depends on configured provider keys
- external job freshness depends on provider availability and SSL/network health
- raw IP deployment is acceptable for demo, but not ideal long term

## Future Improvements

- PostgreSQL instead of SQLite
- object storage for uploaded CVs and derived artifacts
- real authentication and cross-device sync
- HTTPS plus domain for the backend
- hosted vector database or cleaner storage abstraction
- background job queue for heavier processing

## Related Docs

- [Root README](../README.md)
- [Stack Report](../docs/stack-report.md)
- [Architecture](../docs/architecture.md)
- [API Guide](../docs/API.md)
