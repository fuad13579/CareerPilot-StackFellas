#  CareerPilot

> **AI Career Co-pilot** -- upload a CV, get a real-time job feed with personalized fit scores, draft a cover letter, and track every application. Built for the **CodeSprint 2026** hackathon by **StackFellas**.

---

##  Overview

CareerPilot turns a static CV into a working job-search workspace. You upload a resume (PDF/DOCX), the backend parses it into structured sections and skills, an LLM ranks live job listings against your profile, and a Kanban-style tracker keeps your applications organized end-to-end.

It's intentionally a **hackathon MVP** -- fast, opinionated, and demo-ready, with a clear path toward production hardening after the event.

---

##  Key Features

- **CV parsing & skills extraction** -- PDF/DOCX upload, section chunking, RAG-ready profile with a normalized skill list.
- **Live multi-source job search** -- Adzuna + Arbeitnow + Remotive fanned out in parallel, deduplicated, and ranked.
- **Personalized fit scores** -- per-job score (0-100) with matched/missing skills, recomputed live from your CV.
- **RAG-powered AI assistant** -- ask "what skills am I missing for backend roles?" and get answers grounded in your CV + the live job pool.
- **Cover letter generation** -- one-click drafts tuned to a specific job listing and your profile.
- **Kanban application tracker** -- `Applied -> Interview -> Offer / Rejected` with todos and calendar events per application.
- **15-minute response cache** -- SQLite-backed TTL cache on live job searches to protect free-tier API quotas (`force_refresh` opt-out).
- **Anonymous sessions** -- no login required; an anonymous user id is generated on first visit and persisted to `localStorage`.

---

##  Tech Stack

### Frontend (`frontend/`)
- **Next.js** 16.2.6 (App Router) + **React** 19.2.4
- **TypeScript** ^5
- **Tailwind CSS** ^4
- **Framer Motion** ^12.40.0 (page transitions, micro-interactions)
- **Lucide React** ^1.16.0 (icons)
- **@fontsource/inter** + **@fontsource/manrope** (self-hosted fonts)
- **uuid** ^9.0.0 (anonymous session id)

### Backend (`backend/`)
- **FastAPI** 0.136.3 + **uvicorn** 0.47.0
- **SQLAlchemy** 2.0.40 + SQLite (auto-created on startup)
- **Pydantic** (request/response models)
- **python-multipart** 0.0.29 (file uploads)
- **pypdf** 6.1.3 + **python-docx** 1.2.0 (CV text extraction)
- **sentence-transformers** 5.1.1 (embeddings)
- **scikit-learn** 1.7.2 + **numpy** 2.3.4 (vector math)
- **httpx** 0.28.1 (job API fan-out)
- **python-dotenv** 1.2.2 (env loading)
- **pytest** 8.3.5 (test suite)

### AI Providers (priority chain)
1. **GitHub Models** (recommended) -- uses a PAT with `models: read` scope. **Real LLM** answer, green chip in the UI.
2. **OpenRouter** (fallback) -- `openrouter/auto:free` routes to free-tier models. **Real LLM** answer, green chip in the UI.
3. **Rule-based CV/RAG fallback** (always available, no key required). **Not** an LLM -- it is a deterministic, intent-routed pipeline over the parsed CV sections (`fallback_response_service.py`). The UI shows an amber "Built-in CV analysis" chip so the user can always tell which engine answered. See `docs/evaluation.md` section 6 for the full contract.

### Job APIs
- **Adzuna** -- env-gated, free tier 250 calls/month
- **Arbeitnow** -- keyless
- **Remotive** -- keyless (remote-only)

---

##  Project Layout

```
CareerPilot-StackFellas/
 backend/                 FastAPI app, SQLAlchemy models, services
    app/
       api/             Route modules (cv, jobs, fit, rag, assistant, )
       models/          Pydantic + SQLAlchemy schemas
       services/        Business logic (parsing, scoring, caching, LLM)
       storage/         Uploaded CVs, processed sections, vector DB
       utils/           Shared helpers
       database.py      SQLAlchemy engine + session factory
       main.py          FastAPI app + router wiring
    tests/               Pytest suite
    .env.example         Sample environment variables
    requirements.txt
 frontend/                Next.js 16 app
    src/app/             App Router pages (upload, jobs, assistant, )
    src/components/      UI components (Kanban, job cards, modals, )
    package.json
 docs/                    Architecture, evaluation, and demo runbook (see Documentation)
 start-dev.ps1            One-shot dev launcher (Windows / PowerShell)
 start-dev.js             Cross-platform Node variant of the launcher
 dev-down.ps1             Stops the dev servers cleanly
 create-labels.sh         GitHub label helpers
 create-labels-unix.sh    Unix variant
 README.md                You are here
```

---

##  Setup

### 1. Clone the repository

```bash
git clone <your-fork-url> CareerPilot-StackFellas
cd CareerPilot-StackFellas
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# (optional) fill in AI provider + Adzuna keys -- see below
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

---

##  Environment Variables

All backend configuration lives in `backend/.env` (git-ignored). Copy from `.env.example`.

| Variable | Required? | Purpose |
| --- | --- | --- |
| `GITHUB_MODELS_TOKEN` | Optional | GitHub PAT with `models: read` scope. Recommended primary LLM provider. |
| `GITHUB_MODELS_MODEL` | Optional | Model id, defaults to `openai/gpt-4o`. |
| `OPENROUTER_API_KEY` | Optional | Fallback LLM provider. |
| `OPENROUTER_MODEL` | Optional | Defaults to `openrouter/auto:free`. |
| `OPENROUTER_APP_NAME` | Optional | Branding in OpenRouter analytics. |
| `OPENROUTER_APP_URL` | Optional | Referer URL in OpenRouter analytics. |
| `CORS_ORIGINS` | Optional | Comma-separated origins, default `http://localhost:3000,http://127.0.0.1:3000`. |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Optional | Upgrade the job search to real free-text + location filtering. Free at https://developer.adzuna.com/ (250 calls/month). |
| `ADZUNA_COUNTRY` | Optional | Two-letter country code (`us`, `gb`, `de`, ), default `us`. |
| `JOB_CACHE_TTL_SECONDS` | Optional | Override the 15-minute default for the job-search cache. |

> **No key = demo still works.** With no API keys configured, the app still runs end-to-end on the rule-based fallback LLM and the keyless job sources (Arbeitnow + Remotive).

---

##  Run

The included launcher starts both servers in the background and logs to the repo root.

### Windows / PowerShell (recommended)

```powershell
# Start both servers (detached, logs in backend-dev.{out,err}.log, frontend-dev.{out,err}.log)
.\start-dev.ps1

# Open the app
# Frontend  http://localhost:3000
# Backend   http://127.0.0.1:8000
# API docs  http://127.0.0.1:8000/docs

# Stop both servers
.\dev-down.ps1
```

### Cross-platform Node launcher

```bash
node start-dev.js
```

### Manual start

```bash
# Terminal 1  backend
cd backend
.venv\Scripts\Activate.ps1   # or: source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2  frontend
cd frontend
npm run dev
```

---

##  Dev Launcher Cheat-Sheet

| Script | What it does |
| --- | --- |
| `start-dev.ps1` | Spawns detached `uvicorn` (port 8000) and `next dev` (port 3000) processes. Safe to re-run. |
| `start-dev.js` | Node-based cross-platform equivalent of the launcher. |
| `dev-down.ps1` | Kills whatever is listening on ports 8000 / 3000. Safe to re-run. |
| `backend/check-env.py` | Prints the resolved env (no secrets leaked). |
| `backend/probe-*.ps1` | Ad-hoc curl-style probes against the live job sources. |

Logs land at the repo root: `backend-dev.out.log`, `backend-dev.err.log`, `frontend-dev.out.log`, `frontend-dev.err.log`.

---

##  AI Provider Setup

The backend uses a **priority chain** -- the first provider with a valid key wins.

### 1. GitHub Models (recommended)

1. Create a personal access token at https://github.com/settings/tokens with the **`models: read`** scope.
2. Set in `backend/.env`:
   ```env
   GITHUB_MODELS_TOKEN=<your_github_pat_here>
   GITHUB_MODELS_MODEL=openai/gpt-4o
   ```
3. Verify with `GET /api/health/providers` -- should report GitHub Models as `ready`.

> All values above are placeholders. Never commit real keys. `backend/.env` is git-ignored; only `.env.example` (with empty placeholders) is tracked.

### 2. OpenRouter (fallback)

1. Sign up at https://openrouter.ai and create an API key.
2. Set in `backend/.env`:
   ```env
   OPENROUTER_API_KEY=<your_openrouter_key_here>
   OPENROUTER_MODEL=openrouter/auto:free
   ```
3. `GET /api/health/providers` should report OpenRouter as `ready` and GitHub Models as `not_configured`.

### 3. Rule-based fallback (default)

No configuration needed. The `assistant`, `cover-letter`, and `fit` services fall back to a deterministic rule-based pipeline built on top of the parsed CV sections and the live job pool.

---

##  Job API Setup

Out of the box, CareerPilot fans out to **Arbeitnow** and **Remotive** (both keyless). To unlock the real **Adzuna** free-text + location search:

1. Register at https://developer.adzuna.com/ (free, 250 calls/month).
2. Set in `backend/.env`:
   ```env
   ADZUNA_APP_ID=<your_adzuna_app_id_here>
   ADZUNA_APP_KEY=<your_adzuna_app_key_here>
   ADZUNA_COUNTRY=us
   ```
3. Restart the backend. The `/api/jobs/search` route will start including Adzuna results in its fan-out.

**Rate-limit protection:** every successful live fetch is cached in SQLite (`job_search_cache` table, SHA-1 keyed on `query|location|limit`) for **15 minutes**. Pass `?force_refresh=true` to bust the cache for a single request.

---

##  Demo Flow (90-second walkthrough)

1. **Land on `/`** -- animated hero, "Get Started" CTA.
2. **Upload your CV** at `/upload` -- drag a PDF/DOCX, hit "Analyze". Sections + skills appear within a few seconds.
3. **Browse jobs** at `/jobs` -- live results from Arbeitnow / Remotive (and Adzuna if configured). Each card shows a **fit score** with matched/missing skills.
4. **Ask the assistant** at `/assistant` -- try *"What backend skills am I missing for senior Python roles?"* The RAG pipeline grounds the answer in your CV chunks + the visible job pool.
5. **Generate a cover letter** at `/cover-letter` -- pick a job, get a tailored draft, copy to clipboard.
6. **Track it** at `/tracker` -- drag an application from `Applied` to `Interview` to `Offer` / `Rejected` on the Kanban board. Todos and calendar events update in place.

---

##  Screenshots

> **Placeholders below -- no real screenshots have been added yet.** Drop PNGs at the suggested paths and they will render automatically.
> Suggested paths: `docs/screenshots/upload.png`, `docs/screenshots/jobs.png`, `docs/screenshots/assistant.png`, `docs/screenshots/tracker.png`.

| Upload | Jobs | Assistant | Tracker |
| --- | --- | --- | --- |
| _(screenshot pending -- `docs/screenshots/upload.png`)_ | _(screenshot pending -- `docs/screenshots/jobs.png`)_ | _(screenshot pending -- `docs/screenshots/assistant.png`)_ | _(screenshot pending -- `docs/screenshots/tracker.png`)_ |

---

##  Testing

### Backend (pytest)

```bash
cd backend
.venv\Scripts\Activate.ps1
pytest -q
```

The suite covers:
- `test_cv_upload_validation.py` -- upload happy path + rejection cases
- `test_database_persistence.py` -- SQLite round-trip for all models
- `test_anonymous_user_persistence.py` -- anonymous user id flow
- `test_job_search.py` -- live job fan-out + cache behavior
- `test_skills_fit.py` -- fit-score math

### Manual smoke tests

- `python backend/test_rag.py` -- exercises the RAG pipeline end-to-end against the in-memory DB.

---

##  Documentation

| Doc | What it covers |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | C4-style context + container diagram, component breakdown, end-to-end data flow (CV upload -> ingestion -> RAG -> assistant / cover letter / tracker), storage layout, and deployment topology. The architecture diagram the brief asks for. |
| [`docs/evaluation.md`](docs/evaluation.md) | Evaluation suite: 5 Pillar 3 benchmark query cases (readiness, skill gap, roadmap, cover letter, conversational memory), the full pytest contract, manual end-to-end cases, and adversarial / guard-rail cases with pass/fail verdicts. |
| [`docs/demo-runbook.md`](docs/demo-runbook.md) | 5-minute recorded-demo script. Time-boxed steps for CV upload, job search, fit score, AI assistant, cover letter, and tracker update, with the exact UI actions, expected visible output, and failure-mode talking points. |

---

##  Anonymous Session Note

> **Current version uses anonymous browser-based user sessions. Full login/auth can be added later for cross-device persistence.**

CareerPilot ships **without authentication** by design -- it's a hackathon demo, and we wanted a zero-friction first run. The first time a browser hits the app:

1. A `careerpilot_user_id` (UUID v4) is generated and stored in `localStorage`.
2. Every API call sends it as the `x-careerpilot-user-id` header (with `?user_id=` as a query-string alias for tools that strip headers).
3. All DB rows (CVs, applications, todos, assistant sessions) are scoped to that id.

> **Implication:** clearing site data = fresh user. Multi-device sync is explicitly out of scope for the hackathon.

---

##  Roadmap (post-hackathon)

- **Auth & multi-device sync** -- replace the anonymous id with a real identity layer.
- **Job application auto-apply** -- browser automation behind a feature flag.
- **More job sources** -- LinkedIn, Indeed, Greenhouse, Lever scrapers.
- **Resume versioning** -- keep a history of CVs and A/B test cover letters.
- **Calendar integration** -- Google / Outlook OAuth for interview scheduling.
- **Production observability** -- structured logs, request tracing, Prometheus metrics.
- **Background job queue** -- Celery / RQ for long-running CV processing.

---

##  Team  StackFellas

- **Fuad Bin Sattar** (`fuad13579`) -- Team Lead / Backend & Integrations
- **Tahmeed Ahmed** (`tahmeedahmed06-pixel`) -- Frontend & Design
- **Imtiaz Alam** (`Imtiazalam11`) -- Dashboard & Tracker

Built for **CodeSprint 2026**.
