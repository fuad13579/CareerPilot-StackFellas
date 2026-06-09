# CareerPilot Stack Report and Technical Justification

## Executive Summary

CareerPilot is a hackathon MVP that turns a user CV into an active job-search workspace. The system parses and stores the CV, builds a local retrieval index, searches live job sources, computes fit scores programmatically, answers career questions with CV-grounded context, drafts cover letters, and persists tracker activity.

The stack choices are optimized for CodeSprint priorities:

- fast implementation
- clear technical reasoning
- honest live integrations
- demo reliability
- a credible path to scale later

This is not presented as a production-grade enterprise platform. It is a practical, judge-ready MVP with explicit trade-offs.

## Selected Tech Stack

| Layer | Selected Stack | Why It Was Chosen |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 | Fast iteration, typed UI contracts, App Router structure, clean deployment on Vercel |
| Backend | FastAPI, Python 3.11, Uvicorn | Rapid API development, type-safe request models, strong fit for Python AI/document tooling |
| Persistence | SQLite + local filesystem | Lowest-friction persistent storage for a single-VM hackathon MVP |
| CV parsing | `pypdf`, `python-docx` | Direct support for the required CV file types |
| Retrieval | `sentence-transformers` with hashing fallback | Local RAG without introducing external vector infrastructure |
| Live jobs | Adzuna, Arbeitnow, Remotive | Real external job data with a mix of keyless and credentialed sources |
| AI generation | GitHub Models, OpenRouter, built-in fallback | Best-effort hosted AI with a non-fake fallback for demo reliability |
| Deployment | Vercel frontend + Azure VM backend + `systemd` | Simple split deployment that matches framework strengths |

## Why Next.js

Next.js is the right frontend choice for this project because it provides:

- a clean route-based structure for multi-page product flows
- server-side route handlers for API proxying
- straightforward Vercel deployment
- strong React ecosystem support

CareerPilot benefits from Next.js specifically because the app is not a single-screen demo. It has multiple surfaces:

- upload
- jobs
- assistant
- cover letter
- tracker
- productivity

Those flows fit naturally into the App Router model.

## Why FastAPI

FastAPI is a strong backend choice for CareerPilot because it offers:

- rapid API development
- typed request and response contracts
- automatic Swagger docs for judges and developers
- clean compatibility with Python libraries used for CV parsing, retrieval, and HTTP integrations

It also supports a clean split between:

- route modules
- service-layer logic
- database models

That matters because CareerPilot is more than a CRUD backend. It includes orchestration across parsing, job APIs, scoring, and AI responses.

## Why Azure VM

The current backend design writes to local persistent disk:

- uploaded CV files
- processed CV text
- processed CV sections
- vector metadata and embeddings
- SQLite database

Because of that, a normal VM is a better fit than a serverless backend for the MVP. An Azure VM gives the team:

- a persistent disk
- a stable process host for `uvicorn`
- easy `systemd` service management
- enough flexibility to run the current local-first storage design unchanged

For a hackathon MVP, this is a defensible infrastructure choice.

## Why Vercel

Vercel is the natural deployment target for the frontend because:

- Next.js support is first-class
- deployment is simple and fast
- environment-variable management is straightforward
- it reduces time spent on frontend hosting concerns

This lets the team focus more effort on backend logic and product flow rather than frontend infrastructure.

## Why External Job APIs

CareerPilot needs live jobs, not static fixtures, to be credible. External job APIs provide:

- real listings
- real freshness and rate-limit constraints
- a stronger proof that the product is not hardcoded

The current source mix is practical:

- Adzuna for stronger free-text search when credentials exist
- Arbeitnow as a keyless live source
- Remotive as another keyless live source

This gives both demo resilience and honest external integration.

## Why Local VM Persistence for the MVP

The project currently uses local persistence because it keeps the implementation simple and reliable:

- SQLite for structured app data
- VM disk for files and vectors
- no extra managed services required during the hackathon

This decision reduces integration complexity, cost, and deployment risk. For CodeSprint, that is usually the correct trade-off if the team documents the limitations honestly.

## Trade-offs

The current stack deliberately trades long-term scale for short-term delivery speed.

### Advantages

- fast to build
- easy to run locally
- easy to deploy on a single VM
- easy for judges to inspect and reproduce
- no dependency on a separate vector database

### Limitations

- SQLite is not ideal for high concurrency
- local disk storage does not support multi-instance horizontal scaling
- vector artifacts are tied to one machine
- anonymous browser identity is not full authentication
- hosted-model quality depends on configured provider keys

## Scaling Plan to 10,000 Users

The current architecture would need several changes to support roughly 10,000 users reliably.

### What would break first

- SQLite write concurrency
- local file storage for uploaded CVs and vectors
- single-VM backend capacity
- external job API quotas

### Recommended scale-out path

1. Replace SQLite with managed PostgreSQL
2. Move uploaded CVs and processed artifacts to object storage such as Azure Blob Storage
3. Replace local vector files with a managed vector layer such as Qdrant, Pinecone, or `pgvector`
4. Add Redis for caching
5. Add background workers for CV processing and heavier tasks
6. Run multiple backend instances behind a load balancer
7. Add structured monitoring, tracing, and alerting

## Estimated Cost Categories

Exact production costs depend on the chosen VM size and hosted-model usage. The repository does not prove the final Azure SKU, so exact monthly numbers should not be invented here.

The main cost categories are:

- frontend hosting
- backend VM compute
- LLM usage
- managed database and object storage if the system is scaled
- vector database if moved off local disk
- bandwidth and monitoring

For the hackathon MVP, the cost profile is intentionally low because:

- the frontend can run on low-cost Vercel tiers
- the backend is a single VM
- the built-in fallback allows operation even without paid LLM traffic
- two job sources are keyless

## Key Bottlenecks

The main bottlenecks in the current design are:

- local-first persistence model
- single-host backend architecture
- external API quotas and upstream availability
- retrieval quality degradation when transformer embeddings are unavailable and hashing fallback is used
- lack of background processing for heavier workflows

## Future Production Migration Plan

After the hackathon, the most sensible migration plan is:

1. Introduce real authentication and user accounts
2. Move structured data from SQLite to PostgreSQL
3. Move CV artifacts to object storage
4. Move vectors to managed vector storage or `pgvector`
5. Introduce Redis and worker queues
6. Add HTTPS, observability, and deployment automation
7. Replace anonymous browser-only identity with cross-device persistence

## Technical Justification Summary

CareerPilot uses a stack that is appropriate for a CodeSprint submission because it is:

- simple enough to ship quickly
- rich enough to demonstrate real technical depth
- honest about AI versus deterministic logic
- robust enough to keep working when optional providers are unavailable

The strongest technical decisions are:

- making the CV the central state object
- using FastAPI for typed orchestration
- using Next.js route handlers to hide backend details from the browser
- keeping fit scoring deterministic
- using live external job APIs instead of mock data
- maintaining a local-first storage model that can run on a single VM

That combination makes CareerPilot a credible MVP rather than a thin UI over vague AI claims.
