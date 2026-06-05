# CareerPilot Stack Report And Architecture Decision Document

## Project Overview

CareerPilot is an AI career co-pilot built for the CodeSprint 2026 hackathon. The product goal is to turn a static CV into an active job-search workspace that can:

- parse and structure the user's CV
- search live job sources
- compute programmatic fit scores between a CV and a job
- answer career questions with CV-grounded context
- generate tailored cover letters
- track applications, deadlines, tasks, and progress

The system is intentionally optimized for a demo-ready, runnable-from-source submission. It favors a pragmatic local-first architecture over a cloud-heavy setup so judges can run it locally with minimal dependencies.

## Technology Stack

### Frontend Stack

CareerPilot uses:

- `Next.js 16` with App Router
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Framer Motion`
- `Lucide React`

Why this frontend stack was chosen:

- `Next.js` gives a structured application shell, route-based page organization, API proxy routes, and a strong local development workflow.
- `React` is a practical fit for highly interactive UI such as kanban tracking, assistant chat, forms, and live state updates.
- `TypeScript` reduces integration errors between frontend and backend response shapes.
- `Tailwind CSS` makes it fast to build custom hackathon UI without spending time on a larger design system.
- `Framer Motion` helps the product feel polished and deliberate for demo/judging without changing core functionality.

### Backend Stack

CareerPilot uses:

- `FastAPI`
- `Python`
- `SQLAlchemy`
- `SQLite`
- `Pydantic`
- `sentence-transformers`
- `scikit-learn`
- `numpy`
- `httpx`
- `pypdf`
- `python-docx`

Why this backend stack was chosen:

- Python is a natural choice for document processing, embeddings, retrieval, and AI orchestration.
- FastAPI provides fast API development with typed request/response models.
- SQLAlchemy gives maintainable persistence logic for CVs, assistant history, applications, todos, and calendar events.
- SQLite keeps the hackathon deployment simple while still providing real persistence.
- `sentence-transformers`, `numpy`, and `scikit-learn` are enough to build a local vector retrieval pipeline without depending on a managed vector database.

## Why FastAPI Is Used

FastAPI was selected because it solves the exact needs of this project well:

- It is quick to develop with under hackathon time pressure.
- It provides strong request and response validation through Pydantic models.
- It generates OpenAPI docs automatically, which helps debugging and judging.
- It fits Python-native AI and data-processing services cleanly.
- It keeps route logic, service logic, and typed models separate in a maintainable way.

In CareerPilot specifically, FastAPI acts as the orchestration layer between:

- CV upload and parsing
- vector retrieval
- LLM provider routing
- live job search fan-out
- fit scoring
- tracker persistence

## Backend Architecture

The backend is organized into:

- `api/`: route handlers
- `models/`: request/response and database models
- `services/`: CV extraction, chunking, retrieval, fit scoring, assistant logic, cover letter logic, job search, caching
- `storage/`: uploaded CV files, processed text/sections, vector artifacts, SQLite database

Key architectural decisions:

1. `Service-oriented backend`
   Route modules stay thin and delegate business logic to services. This keeps features like assistant, fit scoring, and job search testable and reusable.

2. `SQLite for hackathon persistence`
   SQLite is enough for local judging and removes the need for external infrastructure. It persists:
   - CV metadata
   - assistant sessions
   - job applications
   - todos
   - calendar events

3. `Anonymous local profile model`
   Instead of full auth, the app uses a generated browser-level user id sent as `x-careerpilot-user-id`. This keeps the demo friction low while still isolating one user's data from another.

4. `Provider-chain AI strategy`
   Assistant and cover letter generation try GitHub Models first, then OpenRouter, then a deterministic rule-based fallback. This ensures the product still works even if an LLM key is not configured.

## Frontend Architecture

The frontend is organized around feature pages and reusable components:

- `src/app/`: routes such as `/upload`, `/jobs`, `/assistant`, `/tracker`, `/productivity`
- `src/components/`: job cards, assistant chat, kanban board, tracker context, todo forms, deadline list, productivity widgets

Key architectural decisions:

1. `Feature-centric page composition`
   Each pillar of the product has a dedicated route and experience component. This makes demos easy and keeps responsibilities obvious.

2. `Thin frontend API layer`
   The frontend uses Next.js API routes as proxies to the backend. That keeps frontend fetch logic simple and centralizes backend URL handling.

3. `Local persistence for resilience`
   Selected parts of the UI mirror data in `localStorage` so the app degrades gracefully when backend services are unavailable.

4. `Client-first interaction for complex UI`
   Drag-and-drop tracker behavior, assistant chat state, and productivity forms are managed on the client for responsiveness.

## CV Upload And Processing Flow

The CV upload and processing pipeline is:

1. User uploads a `PDF` or `DOCX` file.
2. Backend stores the original file.
3. Text is extracted using:
   - `pypdf` for PDFs
   - `python-docx` for DOCX files
4. Extracted content is chunked into semantically meaningful sections such as:
   - skills
   - experience
   - education
   - projects
   - other
5. Processed text and section JSON are saved to local storage paths in `backend/app/storage/processed_cvs/`.
6. A CV profile row is saved in SQLite.
7. Section chunks are embedded and indexed for retrieval.
8. The frontend receives a `cv_id` and extracted summary data for downstream features.

This design supports both:

- UI feedback after upload
- later reuse by job search, assistant, and cover letter workflows

## RAG Architecture

CareerPilot uses the uploaded CV as the single source of truth for personalization.

The RAG design works like this:

1. The processed CV is split into meaningful sections.
2. Each section becomes an embedding-backed chunk.
3. On an assistant query, the system embeds the user question.
4. The backend retrieves the top relevant CV chunks.
5. Those retrieved chunks are appended as context to the assistant prompt.
6. The final answer is generated either by:
   - GitHub Models
   - OpenRouter
   - rule-based fallback

Important design choice:

- CareerPilot uses `local CV-grounded retrieval`, not generic chat without memory.
- The assistant response also returns `sources`, which are now surfaced in the frontend so judges can see grounding evidence directly.

## Vector Storage And Retrieval Approach

CareerPilot uses a local vector storage approach rather than a hosted vector database.

Current implementation:

- chunk metadata is stored in JSON
- embeddings are stored in `.npy` files
- query retrieval uses local similarity search with `numpy` and `scikit-learn`

Why this approach was chosen:

- easy for judges to run locally
- no external vector DB dependency
- enough scale for a single-user or hackathon demo workflow
- fast enough for CV-sized document retrieval

Tradeoff:

- this is not designed for high-scale multi-tenant production usage
- it is designed for local reliability and simple deployment

## External Job Search Source

CareerPilot's Job Hunter agent searches live external job sources.

Current sources:

- `Adzuna` when API credentials are configured
- `Arbeitnow`
- `Remotive`

Design approach:

1. The backend fans out requests to available providers.
2. Results are normalized into a shared `JobCard` shape.
3. Duplicates are reduced.
4. Results are optionally enriched with personalized fit scoring.
5. Successful live searches are cached for a short TTL to reduce API pressure.

Why this was chosen:

- the hackathon brief requires at least one external tool call
- live search makes the product feel agentic and real
- using multiple providers improves resilience when one source is empty or unavailable

## Job Hunter Agent Flow

The Job Hunter flow is:

1. User enters a natural-language or keyword search query on `/jobs`.
2. Frontend calls `/api/jobs/search`.
3. Backend:
   - validates anonymous user context
   - loads CV skills if a CV exists
   - fetches live jobs
   - normalizes results
   - computes fit scores when personalization is enabled
4. Frontend renders structured job cards with:
   - role
   - company
   - location
   - salary
   - deadline
   - fit score or `Not scored`
   - explanation
5. The user can:
   - apply and save to tracker
   - ask the assistant about a specific job

## Fit Score Logic

CareerPilot implements programmatic fit scoring, not hardcoded labels.

There are two related scoring paths in the codebase:

1. `Job recommendation fit scoring`
   Used for live job search personalization.

2. `CV-to-job fit scoring`
   Used for explicit fit analysis against job descriptions.

Current logic for live job cards:

- extract required skills from:
  - explicit job skill fields
  - job description pattern matching
- normalize user CV skills
- compare overlap between CV skills and job skills
- compute:
  - `matched_skills`
  - `missing_skills`
  - `match_count`
  - `fit_score = matched / total_required * 100`

Important decision:

- when the system cannot identify required job skills, it does **not** fabricate a score
- such jobs are treated as `Not scored`

This change was important for alignment with the problem statement because the brief requires fit scores to be computed programmatically, not guessed.

## AI Assistant Flow

The AI assistant flow is:

1. User opens `/assistant`.
2. Frontend loads:
   - `cv_id`
   - session id
   - optional selected job context
3. User submits a question.
4. Frontend sends:
   - `cv_id`
   - `session_id`
   - `question`
   - optional `job_id`
   - optional `job_context`
5. Backend:
   - validates CV ownership
   - stores conversation history
   - retrieves relevant CV chunks
   - attaches selected job context if present
   - calls LLM provider chain or fallback engine
6. Response includes:
   - answer
   - retrieved context
   - grounding sources
   - provider used
   - fallback flag
7. Frontend renders the answer and visible evidence under `Grounded In Your CV`.

This now supports both:

- generic career questions
- job-specific questions launched directly from the jobs page

## Cover Letter Generation Flow

The cover letter flow uses the same CV-centered philosophy:

1. User chooses a target job.
2. Frontend calls the cover letter API with:
   - CV context
   - selected job data
3. Backend generates a personalized draft using:
   - CV-derived strengths
   - relevant skills
   - job requirements
4. Provider chain is used when available, with fallback behavior when not.
5. Frontend renders the generated letter and supports copy/use actions.

Architectural decision:

- cover letters are generated from structured user context plus target job context
- they are not generic templates detached from the uploaded CV

## Tracker And Dashboard Flow

The tracker and dashboard modules cover the accountability side of the brief.

### Tracker

The tracker stores application records with:

- role
- company
- location
- notes
- fit score
- job URL
- status

Status flow:

- `Applied`
- `Interviewing`
- `Offer`
- `Rejected`

The kanban board allows drag-and-drop status changes and persists them through tracker APIs.

### Dashboard

The dashboard aggregates:

- recommended jobs
- application stats
- tracker progress
- CV-derived summaries

It acts as the high-level summary screen tying together the user's profile, opportunities, and activity.

### Productivity

The productivity module includes:

- todo management
- deadline tracking
- weekly goals
- calendar-style planning
- AI-style nudges

Together, tracker plus productivity satisfy the brief's requirement for day-to-day accountability features.

## Architecture And Data-Flow Diagram

The main architecture and data-flow diagram already exists and should be referenced directly:

- [`docs/architecture.md`](./architecture.md)

That document includes:

- high-level architecture
- CV upload to assistant flow
- RAG pipeline flow
- job search and fit scoring flow
- tracker data flow

This stack report is the narrative companion to that architecture diagram.

## Current Limitations

Current limitations include:

- SQLite is excellent for local judging, but not ideal for large concurrent multi-user scale.
- The local vector store is simple and portable, but not optimized for high-volume retrieval workloads.
- The productivity calendar is a lighter 7-day planning view, not a full enterprise-grade calendar product.
- Goal categories are currently strongest in the frontend UX and could be modeled more explicitly in backend persistence.
- Some fallback behavior still exists to protect the demo when an external service is down.
- Job-specific assistant context works well from live job cards, but could be expanded further from tracker-saved applications and dashboard recommendations.

## Future Improvements

Recommended future improvements:

- add proper authentication and multi-device persistence
- move from local vector files to a dedicated vector database for scale
- introduce a richer backend goal model for todos/events
- add stronger assistant citations and section-level source labels
- expand job-source coverage beyond current APIs
- add browser-assisted job application automation behind a feature flag
- add background jobs for heavier CV processing tasks
- improve observability with structured logging and metrics
- upgrade the productivity planner into a richer month/week calendar experience

## Acceptance Criteria Mapping

This document satisfies the requested acceptance criteria as follows:

- `Stack report document exists`
  - this file is the stack report and architecture decision document

- `Technology choices are explained clearly`
  - see `Technology Stack`, `Why FastAPI Is Used`, `Backend Architecture`, and `Frontend Architecture`

- `Architecture decisions are documented`
  - see the architecture sections and the stated design decisions throughout the document

- `RAG flow is explained`
  - see `RAG Architecture` and `Vector Storage And Retrieval Approach`

- `Fit score logic is explained`
  - see `Fit Score Logic`

- `Document is useful for judges and team members`
  - the document explains how the system works, why the stack was chosen, and where the current tradeoffs are

