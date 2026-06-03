# CareerPilot by StackFellas

AI-powered career assistant: CV parsing, job search, fit scoring, RAG over your CV, cover-letter drafting, and application tracking.

- **Frontend**: Next.js (TypeScript, Tailwind) → `http://localhost:3000`
- **Backend**: FastAPI + SQLite (LLM provider chain: GitHub Models → OpenRouter → rule-based fallback) → `http://127.0.0.1:8000`

---

## Quick start — dev servers (one command)

From the repo root:

```powershell
# Start both servers (detached, logs go to ./*.log)
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1

# Stop both servers
powershell -ExecutionPolicy Bypass -File .\dev-down.ps1
```

Once running:

- Frontend: <http://localhost:3000>
- Backend: <http://127.0.0.1:8000/health>
- Providers status: <http://127.0.0.1:8000/api/health/providers>

Logs: `backend-dev.out.log`, `backend-dev.err.log`, `frontend-dev.out.log`, `frontend-dev.err.log` in the repo root.

> The `-ExecutionPolicy Bypass` flag is only needed if your machine's PowerShell policy blocks running local `.ps1` scripts. To drop the flag permanently, run once in an elevated shell:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### Alternative: Node launcher (legacy)

The repo also ships `start-dev.js` if you prefer not to use PowerShell:

```bash
node start-dev.js
```

It launches the same two processes but uses the system Python interpreter instead of the project's `.venv`, so prefer `start-dev.ps1` for development.

---

## First-time setup

1. **Create the backend virtualenv and install dependencies**

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

2. **Configure environment variables**

   ```powershell
   copy .env.example .env
   ```

   Edit `backend/.env` and fill in at least one of:
   - `GITHUB_MODELS_TOKEN` — preferred LLM provider (free with a GitHub PAT that has `models:read`).
   - `OPENROUTER_API_KEY` — fallback LLM provider.

   `backend/.env` is git-ignored; the only file in `.env.*` that is committed is `.env.example` (placeholders only).

3. **Install frontend dependencies**

   ```powershell
   cd ..\frontend
   npm install
   ```

4. **Start the dev servers** with the one-liner from the section above.

---

## Useful endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness check (returns `{ "status": "ok" }`). |
| GET | `/api/health/providers` | Reports which LLM provider is active (booleans + model names, never the key values). |
| POST | `/api/cv/upload` | Upload a CV (PDF/DOCX), parse + chunk + embed into the local vector store. |
| GET | `/api/jobs/search` | Search for jobs by free-text query. |
| POST | `/api/fit/score` | Compute fit score between a CV and a job posting. |
| POST | `/api/assistant/chat` | Chat with the RAG assistant over your CV. |

Frontend integration details, request examples, response examples, and error cases are documented in [`docs/API.md`](docs/API.md).
System architecture, RAG flow, job scoring, and tracker data flow are documented in [`docs/architecture.md`](docs/architecture.md).

---

## Project layout

```text
.
├── backend/                 # FastAPI app
│   ├── app/
│   │   ├── api/             # Route modules (cv, jobs, fit, assistant, ...)
│   │   ├── models/          # Pydantic + ORM models
│   │   ├── services/        # Business logic (LLM provider, RAG, scoring, ...)
│   │   ├── storage/         # Uploaded CVs, vector DB, SQLite DB
│   │   └── main.py          # FastAPI entrypoint
│   ├── tests/               # pytest suite
│   ├── .env.example         # Template — committed
│   └── requirements.txt
├── frontend/                # Next.js app
│   ├── src/app/             # App router pages (dashboard, jobs, assistant, ...)
│   └── src/components/      # Shared UI components
├── start-dev.ps1            # Boot both servers (detached)
├── dev-down.ps1             # Stop both servers
├── start-dev.js             # Legacy Node launcher
└── README.md
```

---

## Running the tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

---

## Security notes

- Never commit `backend/.env` — it is in `.gitignore` and contains the real API keys.
- Only `backend/.env.example` (with placeholder values) is committed.
- `/api/health/providers` returns booleans and model identifiers only — it never leaks token values.
