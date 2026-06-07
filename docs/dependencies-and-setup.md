# CareerPilot Dependencies and Setup

This document is the practical install and run guide for judges and developers. It covers the exact dependency managers in this repository, required versions, environment variables, installation commands, local run commands, and common setup issues.

## Repository Structure

- Frontend folder: `frontend/`
- Backend folder: `backend/`
- Frontend package manager: `npm`
- Backend Python dependency manager: `requirements.txt` with `pip`

## Runtime Versions

### Backend

- Python: `3.11`

### Frontend

- Node.js: `20.x` recommended
- npm: the repo uses `package-lock.json`, so use the npm version that ships with Node 20

## Frontend Dependencies

From [frontend/package.json](/abs/path/C:/Users/FUAD/source/repos/CareerPilot-StackFellas/frontend/package.json):

### Runtime dependencies

- `next`
- `react`
- `react-dom`
- `framer-motion`
- `lucide-react`
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`
- `@fontsource/inter`
- `@fontsource/manrope`

### Development dependencies

- `typescript`
- `tailwindcss`
- `@tailwindcss/postcss`
- `eslint`
- `eslint-config-next`
- `@types/node`
- `@types/react`
- `@types/react-dom`

Install command:

```bash
cd frontend
npm install
```

## Backend Dependencies

From [backend/requirements.txt](/abs/path/C:/Users/FUAD/source/repos/CareerPilot-StackFellas/backend/requirements.txt):

- `fastapi`
- `pydantic`
- `uvicorn`
- `python-multipart`
- `python-dotenv`
- `pypdf`
- `python-docx`
- `sentence-transformers`
- `scikit-learn`
- `numpy`
- `httpx`
- `pytest`
- `sqlalchemy`

Install command:

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

Then install:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## Environment Variables

### Frontend

Create `frontend/.env.local` from `frontend/.env.example`.

| Variable | Purpose |
| --- | --- |
| `BACKEND_URL` | Base URL used by Next.js route handlers to reach the FastAPI backend |

Example:

```env
BACKEND_URL=http://127.0.0.1:8000
```

### Backend

Create `backend/.env` from `backend/.env.example`.

| Variable | Purpose |
| --- | --- |
| `CORS_ORIGINS` | Allowed frontend origins |
| `DATABASE_PATH` | SQLite path override |
| `INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE` | Include extracted text in CV upload response |
| `SENTENCE_TRANSFORMER_LOCAL_ONLY` | Restrict embedding model loading to local cache |
| `FIT_SCORE_COMMON_SKILLS` | Skill normalization seed list |
| `FIT_SCORE_SKILL_WEIGHT` | Skill-overlap weight |
| `FIT_SCORE_KEYWORD_WEIGHT` | Keyword-overlap weight |
| `JOB_CACHE_TTL_SECONDS` | Job-cache TTL override |
| `ADZUNA_APP_ID` | Adzuna API id |
| `ADZUNA_APP_KEY` | Adzuna API key |
| `ADZUNA_COUNTRY` | Adzuna country code |
| `GITHUB_MODELS_TOKEN` | Primary hosted LLM provider token |
| `GITHUB_MODELS_MODEL` | GitHub Models model id |
| `OPENROUTER_API_KEY` | Fallback hosted LLM provider token |
| `OPENROUTER_MODEL` | OpenRouter model id |
| `OPENROUTER_APP_NAME` | OpenRouter app label |
| `OPENROUTER_APP_URL` | OpenRouter referer URL |

Important:

- no real secrets should be committed
- `backend/.env` and `frontend/.env.local` are intentionally git-ignored

## Local Setup

### 1. Backend setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment, then:

```bash
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

### 2. Frontend setup

```bash
cd ../frontend
npm install
cp .env.example .env.local
```

## Local Run Commands

### Recommended one-command dev start

From the repo root:

```bash
node start-dev.js
```

Expected local endpoints:

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

Current deployed backend endpoints:

- Public backend API: `http://104.211.90.209`
- Public Swagger docs: `http://104.211.90.209/docs`
- Public health check: `http://104.211.90.209/health`

Note:

- the public docs URL is `http://104.211.90.209/docs` without `:8000`
- `:8000` is used for direct local or VM-internal access before `nginx`

### Manual backend start

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Manual frontend start

```bash
cd frontend
npm run dev
```

## Useful Commands

### Frontend

```bash
cd frontend
npm run lint
npm run build
npm run start
```

### Backend

```bash
cd backend
pytest -q
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/health/providers
```

## Common Setup Errors

### `uvicorn` command not found

Cause:

- virtual environment is not activated

Fix:

- activate `backend/.venv`
- rerun `pip install -r requirements.txt`

### Frontend cannot reach backend

Cause:

- backend is not running
- `BACKEND_URL` is wrong

Fix:

- confirm backend health at `http://127.0.0.1:8000/health`
- set `BACKEND_URL=http://127.0.0.1:8000`
- restart the frontend dev server

For deployed frontend on Vercel, use:

- `BACKEND_URL=http://104.211.90.209`

### No hosted AI response appears

Cause:

- no LLM provider key is configured

Fix:

- set `GITHUB_MODELS_TOKEN` or `OPENROUTER_API_KEY` in `backend/.env`
- restart the backend

Note:

- the app still works with the built-in fallback path, but the answer quality and labeling differ

### Job search returns few or no results

Cause:

- live external providers are unavailable
- Adzuna credentials are not configured
- the query is too restrictive

Fix:

- try a simpler query like `python` or `react`
- check internet access from the backend environment
- add Adzuna credentials if you want the strongest free-text source

### RAG quality is weak

Cause:

- `sentence-transformers` model is unavailable locally, so the app falls back to hashing embeddings

Fix:

- ensure the embedding model can load locally
- confirm RAG status in the UI or via the RAG status endpoint

## Judge Quick Start

If a judge wants the shortest path:

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env

cd ..\frontend
npm install
Copy-Item .env.example .env.local

cd ..
node start-dev.js
```
