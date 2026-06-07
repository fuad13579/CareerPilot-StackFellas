# CareerPilot Backend

The backend is a FastAPI application that powers CV ingestion, local RAG, live job search, fit scoring, assistant responses, cover-letter generation, tracker persistence, todos, and calendar events.

## Backend Stack

- FastAPI
- Uvicorn
- Python 3.11
- SQLAlchemy
- SQLite
- Pydantic
- `python-multipart`
- `pypdf`
- `python-docx`
- `sentence-transformers`
- `scikit-learn`
- `numpy`
- `httpx`
- `python-dotenv`
- `pytest`

## Python Version

- Required Python version: `3.11`

## Main API Modules and Routes

The FastAPI entrypoint is `app.main:app`.

Main route groups:

- `/api/cv`
  - CV upload
  - CV sections retrieval
- `/api/jobs`
  - live job search
  - personalized recommendations
- `/api/fit`
  - fit-score APIs
- `/api/rag`
  - RAG status and retrieval diagnostics
- `/api/assistant`
  - assistant query
  - assistant history
- `/api/cover-letter`
  - cover-letter generation
- `/api/tracker`
  - saved applications and status updates
- `/api/todos`
  - todo CRUD and stats
- `/api/calendar`
  - calendar event CRUD
- `/health`
- `/api/health`
- `/api/health/providers`

## Virtual Environment Setup

From the repo root:

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

## Install Command

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## Run Command

Local development:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Production-style process:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Swagger and API Docs

When running locally:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

Current documented deployed backend:

- API base: `http://104.211.90.209`
- Swagger UI: `http://104.211.90.209/docs`
- Health: `http://104.211.90.209/health`

## Environment Variables

Create `backend/.env` from `backend/.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `CORS_ORIGINS` | Recommended | Comma-separated allowed frontend origins |
| `DATABASE_PATH` | Optional | SQLite path override |
| `INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE` | Optional | Include extracted text in upload response |
| `SENTENCE_TRANSFORMER_LOCAL_ONLY` | Optional | Load `sentence-transformers` from local cache only |
| `FIT_SCORE_COMMON_SKILLS` | Optional | Normalization seed list for fit scoring |
| `FIT_SCORE_SKILL_WEIGHT` | Optional | Skill-overlap weight |
| `FIT_SCORE_KEYWORD_WEIGHT` | Optional | Keyword-overlap weight |
| `JOB_CACHE_TTL_SECONDS` | Optional | Job search cache TTL override |
| `ADZUNA_APP_ID` | Optional | Adzuna API id |
| `ADZUNA_APP_KEY` | Optional | Adzuna API key |
| `ADZUNA_COUNTRY` | Optional | Adzuna country code |
| `GITHUB_MODELS_TOKEN` | Optional | Primary hosted LLM provider |
| `GITHUB_MODELS_MODEL` | Optional | GitHub Models model id |
| `OPENROUTER_API_KEY` | Optional | Fallback hosted LLM provider |
| `OPENROUTER_MODEL` | Optional | OpenRouter model id |
| `OPENROUTER_APP_NAME` | Optional | OpenRouter analytics label |
| `OPENROUTER_APP_URL` | Optional | OpenRouter referer URL |

## Azure VM Deployment Notes

Current deployment shape:

- backend hosted on Azure Ubuntu VM
- `uvicorn` managed by `systemd`
- `nginx` reverse-proxy in front of the app
- frontend deployed separately on Vercel

Typical dependency install on the VM:

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip nginx git
```

Deploy/update flow:

```bash
git pull
cd backend
source .venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart careerpilot-backend
```

## Example systemd Service

```ini
[Unit]
Description=CareerPilot FastAPI backend
After=network.target

[Service]
User=<vm-user>
Group=<vm-user>
WorkingDirectory=/home/<vm-user>/CareerPilot-StackFellas/backend
EnvironmentFile=/home/<vm-user>/CareerPilot-StackFellas/backend/.env
ExecStart=/home/<vm-user>/CareerPilot-StackFellas/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## How to Check Logs

systemd logs:

```bash
sudo journalctl -u careerpilot-backend -n 200 --no-pager
sudo journalctl -u careerpilot-backend -f
```

Useful local/dev logs in the repo:

- `backend-dev.out.log`
- `backend-dev.err.log`
- `backend/uvicorn.out.log`
- `backend/uvicorn.err.log`

## How to Restart the Backend

On the VM:

```bash
sudo systemctl restart careerpilot-backend
sudo systemctl status careerpilot-backend
```

If `nginx` sits in front:

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

## Storage and Persistence Notes

The backend is local-first and persists data on the VM disk.

Key storage paths:

- SQLite database:
  - `backend/app/storage/careerpilot.db`
- Uploaded CV files:
  - `backend/app/storage/uploaded_cvs/`
- Processed CV text and section JSON:
  - `backend/app/storage/processed_cvs/`
- Local vector metadata and embeddings:
  - `backend/app/storage/vector_db/`

This works well for a hackathon MVP on a persistent VM, but it is not the right long-term design for multi-instance production scaling.

## Testing

Run the backend test suite:

```bash
pytest -q
```

Run provider and health checks:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/health/providers
```

## Related Docs

- [Root README](../README.md)
- [Architecture](../docs/architecture.md)
- [Stack Report](../docs/stack-report.md)
- [Deployment Guide](../docs/deployment.md)
