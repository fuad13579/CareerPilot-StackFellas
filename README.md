# CareerPilot

CareerPilot is an agentic career co-pilot for CodeSprint 2026. A user uploads a CV, the backend parses and indexes it, the app searches live job sources, computes fit scores, answers CV-grounded assistant questions, drafts cover letters, and tracks applications in one workflow.

## Problem Summary

Job seekers usually juggle separate tools for resumes, job boards, cover letters, and tracking. CareerPilot makes the uploaded CV the source of truth so search, fit analysis, assistant responses, and tracking all stay connected.

## Key Features

- CV upload with PDF and DOCX support
- CV parsing into structured sections and extracted skills
- Local RAG over the uploaded CV
- Live job search across Adzuna, Arbeitnow, and Remotive
- Programmatic fit scoring with matched and missing skills
- AI assistant with hosted-model and built-in fallback modes
- Cover letter generation from CV plus job context
- Application tracker with Kanban workflow
- Todo, calendar, and productivity views

## Live Demo Links

- Frontend: `<add-vercel-url>`
- Backend API: `http://104.211.90.209`
- Swagger / OpenAPI: `http://104.211.90.209/docs`

## Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lucide React |
| Backend | FastAPI, Uvicorn, Python 3.11, SQLAlchemy, SQLite, Pydantic |
| CV Processing | `pypdf`, `python-docx` |
| RAG / Retrieval | `sentence-transformers` (`all-MiniLM-L6-v2`) with `HashingVectorizer` fallback |
| Live Job Sources | Adzuna, Arbeitnow, Remotive |
| AI Providers | GitHub Models, OpenRouter, built-in fallback pipeline |
| Deployment | Vercel frontend, Azure VM backend, `systemd`, `nginx` |

## Architecture Overview

- The Next.js frontend handles pages and user interaction.
- Next.js route handlers under `frontend/src/app/api/*` proxy browser requests to the FastAPI backend using `BACKEND_URL`.
- The FastAPI backend parses CVs, stores local artifacts, fans out to external job APIs, computes fit scores, and persists tracker data.
- RAG is local-first: processed CV sections are stored on disk and embedded into local JSON plus NPY vector artifacts.
- SQLite stores application data, assistant history, todos, calendar events, and job-search cache rows.

Detailed architecture: [docs/architecture.md](docs/architecture.md)

## Project Structure

```text
CareerPilot-StackFellas/
|- frontend/          Next.js application
|- backend/           FastAPI application
|- docs/              Judge-facing technical documentation
|- start-dev.js       Cross-platform local dev launcher
|- start-dev.ps1      PowerShell local dev launcher
`- dev-down.ps1       Stops local frontend and backend ports
```

## Required Environment Variables

### Frontend

Copy `frontend/.env.example` to `frontend/.env.local`:

```env
BACKEND_URL=http://127.0.0.1:8000
```

### Backend

Copy `backend/.env.example` to `backend/.env`. Main variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `CORS_ORIGINS` | Recommended | Comma-separated allowed frontend origins |
| `DATABASE_PATH` | Optional | SQLite database path override |
| `GITHUB_MODELS_TOKEN` | Optional | Primary hosted LLM provider |
| `GITHUB_MODELS_MODEL` | Optional | GitHub Models model id |
| `OPENROUTER_API_KEY` | Optional | Fallback hosted LLM provider |
| `OPENROUTER_MODEL` | Optional | OpenRouter model id |
| `OPENROUTER_APP_NAME` | Optional | Analytics label for OpenRouter |
| `OPENROUTER_APP_URL` | Optional | Referer URL for OpenRouter |
| `ADZUNA_APP_ID` | Optional | Adzuna API id |
| `ADZUNA_APP_KEY` | Optional | Adzuna API key |
| `ADZUNA_COUNTRY` | Optional | Adzuna country code, default `us` |
| `JOB_CACHE_TTL_SECONDS` | Optional | Live jobs cache TTL |
| `INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE` | Optional | Include raw extracted text in upload response |
| `SENTENCE_TRANSFORMER_LOCAL_ONLY` | Optional | Restrict transformer loading to local cache |
| `FIT_SCORE_COMMON_SKILLS` | Optional | Skill normalization seed list |
| `FIT_SCORE_SKILL_WEIGHT` | Optional | Skill-overlap weight |
| `FIT_SCORE_KEYWORD_WEIGHT` | Optional | Keyword-overlap weight |

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
source .venv/bin/activate
```

Install dependencies and create env file:

```bash
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

## Run Locally

### Recommended launcher

From the repo root:

```bash
node start-dev.js
```

This starts:

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

### Manual run

Backend:

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm run dev
```

## Frontend Commands

```bash
cd frontend
npm run dev
npm run build
npm run start
npm run lint
```

## Backend Commands

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pytest -q
```

## Deployment Notes

### Frontend

- Deploy `frontend/` to Vercel
- Set `BACKEND_URL` in Vercel environment variables
- Redeploy after changing the backend URL

### Backend

- Deploy `backend/` to an Azure Ubuntu VM
- Run `uvicorn app.main:app`
- Keep the process alive with `systemd`
- Optionally reverse-proxy with `nginx`

Full deployment notes: [docs/deployment.md](docs/deployment.md)

## Demo Flow

The intended CodeSprint flow is:

1. Upload a CV on `/upload`
2. Search live jobs on `/jobs`
3. Review fit score on a returned job card
4. Ask an assistant question on `/assistant`
5. Generate a cover letter on `/cover-letter`
6. Save the job to tracker and update status on `/tracker`

Demo script: [docs/demo-runbook.md](docs/demo-runbook.md)

## Known Limitations

- The backend is a hackathon MVP, not a production-grade multi-tenant platform.
- Persistence is local-first: SQLite and VM disk rather than managed cloud storage.
- Anonymous browser-scoped identity is used instead of full authentication.
- Job freshness depends on external API availability and quotas.
- RAG quality is best when `sentence-transformers` is available locally; otherwise retrieval falls back to hashing.
- The deployed backend is currently documented by IP rather than a proper domain.

## Future Improvements

- PostgreSQL instead of SQLite
- Azure Blob Storage or similar for CV and derived artifacts
- Managed vector database or `pgvector`
- Real authentication and cross-device sync
- Background workers for CV processing and heavier jobs
- HTTPS plus domain-based backend deployment
- Structured monitoring and alerting

## Team

- Member 1: `<name / role>`
- Member 2: `<name / role>`
- Member 3: `<name / role>`

## Additional Docs

- [docs/dependencies-and-setup.md](docs/dependencies-and-setup.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/stack-report.md](docs/stack-report.md)
- [docs/evaluation-suite.md](docs/evaluation-suite.md)
- [docs/demo-runbook.md](docs/demo-runbook.md)
- [docs/deployment.md](docs/deployment.md)
