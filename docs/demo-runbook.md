# CareerPilot Demo Runbook

This runbook is designed for a 5-minute CodeSprint demo that proves the full product flow:

`CV upload -> job search -> fit score -> AI assistant query -> cover letter draft -> tracker update`

## Pre-Demo Checklist

- Confirm the frontend is reachable
- Confirm the backend health endpoint returns success:
  - `GET /health`
  - `GET /api/health/providers`
- Prepare a valid sample CV in PDF or DOCX format
- Clear the browser tab only if you want to start with a fresh anonymous user
- Confirm the backend can reach at least one live job API
- If you want the hosted-model demo path, confirm either:
  - `GITHUB_MODELS_TOKEN` is configured, or
  - `OPENROUTER_API_KEY` is configured

## Recommended Local Demo Start

From the repo root:

```bash
node start-dev.js
```

Expected local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

## Sample CV Instruction

Use a real-looking one-page or two-page software CV with clear sections such as:

- experience
- projects
- skills
- education

The demo works best when the CV includes recognizable technologies such as `Python`, `React`, `SQL`, `FastAPI`, or `AWS`, because those are easy to map visibly into fit scoring and assistant answers.

## 5-Minute Demo Script

### 1. CV Upload

- Go to `/upload`
- Upload a sample PDF or DOCX CV
- Wait for processing to finish

What to say:

`CareerPilot starts with the user's CV. We extract text, split it into sections, save the processed CV, and build a local retrieval index for later assistant and cover-letter flows.`

What judges should see:

- successful upload state
- extracted skills
- RAG status information

### 2. Job Search

- Go to `/jobs`
- Use a natural-language query such as:

`remote python backend internship`

or

`hybrid data analyst jobs in New York at least 100k`

What to say:

`The search is live. The backend fans out to external job sources, normalizes the results, applies query parsing, and returns jobs with source metadata.`

What judges should see:

- returned job cards
- source/provider labels
- live search state rather than a static fixture list

## 3. Fit Score

- Open one of the returned job cards
- Highlight the visible fit score and matched or missing skills

What to say:

`The fit score is computed programmatically from the uploaded CV and the returned job, so it is explainable and not just generated text.`

What judges should see:

- fit score
- matched skills
- missing skills

## 4. AI Assistant Query

- Go to `/assistant`
- Ask one of these prompts:
  - `Am I ready for this kind of backend role?`
  - `What skills am I missing for the jobs I just searched?`
  - `Build me a 3-month roadmap based on my CV`

What to say:

`The assistant retrieves relevant chunks from the user's uploaded CV and then answers with either a hosted model or the built-in fallback path. The UI indicates which provider answered.`

What judges should see:

- grounded answer
- provider or fallback indicator
- response that references the uploaded CV rather than generic advice

## 5. Cover Letter Draft

- Go to `/cover-letter`
- Generate a cover letter for a selected job

What to say:

`The cover letter is generated from the selected job plus the user's CV context, so it should reference actual skills and experience from the uploaded profile.`

What judges should see:

- generated draft
- job-aware personalization

## 6. Tracker Update

- Save the selected job to tracker if that path is available from the UI flow
- Go to `/tracker`
- Move the application through a stage such as `Applied` or `Interviewing`

What to say:

`The platform is not just an analyzer. It persists application workflow so the user can keep working after the AI step.`

What judges should see:

- saved application
- Kanban stage update
- state persistence after reload

## Backup Plan if a Live API Fails

If one external job source is unavailable:

- explain that CareerPilot uses multiple live providers
- show the remaining sources still returning results if available
- mention that search uses a short TTL cache to reduce quota pressure

If hosted LLM access is unavailable:

- show `/api/health/providers`
- explain that the app falls back to the built-in CV-grounded response path
- be explicit that fallback is deterministic, not pretending to be a hosted model

## What to Say During the Demo

Short judge-friendly narrative:

`CareerPilot turns one uploaded CV into a full job-search workspace. We parse the CV, build retrieval context, search live jobs, compute fit programmatically, answer career questions with grounded context, generate a tailored cover letter, and persist the application in tracker. The system is built as a hackathon MVP, so the architecture favors demo reliability and honest live integrations over large-scale infrastructure.`

## Optional Recovery Steps

- Refresh the frontend if local anonymous session state appears stale
- Re-run the backend health checks
- Re-run the search with a simpler query such as `python` or `react`
- If job APIs are degraded, switch to explaining the architecture using the already-uploaded CV, assistant, and tracker flows
