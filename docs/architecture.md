# CareerPilot System Architecture

CareerPilot is a local-first career assistant with a Next.js frontend and a
FastAPI backend. The backend stores uploaded CVs, extracts searchable context,
builds a local vector index for RAG, searches live job sources, scores CV/job
fit, and persists tracker data in SQLite.

## High-Level Architecture

```mermaid
flowchart LR
  User[User] --> FE[Next.js Frontend]

  FE -->|CV upload<br/>multipart/form-data| CVAPI[FastAPI CV API]
  FE -->|Assistant query| AssistantAPI[FastAPI Assistant API]
  FE -->|Job search| JobsAPI[FastAPI Jobs API]
  FE -->|Fit score| FitAPI[FastAPI Fit API]
  FE -->|Save/update applications| TrackerAPI[FastAPI Tracker API]

  CVAPI --> Extract[CV Extraction Service]
  Extract --> Processed[(Processed CV Text<br/>and Sections)]
  Extract --> Uploaded[(Uploaded CV Files)]
  CVAPI --> CVRows[(SQLite CVProfile)]
  CVAPI --> Chunk[CV Sectioning]
  Chunk --> Embed[Embedding Service]
  Embed --> Vector[(Local Vector Store<br/>JSON + NPY)]

  AssistantAPI --> AssistantService[Assistant Service]
  AssistantService --> Vector
  AssistantService --> Provider[LLM Provider Chain<br/>GitHub Models<br/>OpenRouter<br/>Rule-Based Fallback]
  AssistantService --> Sessions[(SQLite AssistantSession)]

  JobsAPI --> JobSources[Live Job Sources<br/>Adzuna, Arbeitnow, Remotive]
  JobsAPI --> Recommend[Job Recommendation Service]
  Recommend --> CVRows
  Recommend --> Processed

  FitAPI --> FitScore[Fit Score Service]
  FitScore --> Processed

  TrackerAPI --> Applications[(SQLite Applications)]
```

## Main Components

| Layer | Component | Responsibility |
| --- | --- | --- |
| Frontend | `frontend/` Next.js app | Upload CVs, search jobs, ask assistant questions, display fit scores, manage tracker UI. |
| API | `backend/app/main.py` | Registers FastAPI routers and configures CORS. |
| API routes | `backend/app/api/*_routes.py` | Request validation, user header checks, and service orchestration. |
| Services | `backend/app/services/` | CV extraction, chunking, embeddings, vector retrieval, LLM calls, job search, fit scoring. |
| Database | SQLite at `backend/app/storage/careerpilot.db` | CV metadata, applications, todos, calendar events, assistant sessions. |
| File storage | `backend/app/storage/` | Uploaded CVs, processed CV text/sections, vector index metadata and embeddings. |
| External APIs | Adzuna, Arbeitnow, Remotive, GitHub Models, OpenRouter | Job search and AI generation providers. |

Most user-specific endpoints use `x-careerpilot-user-id` to isolate local
profiles without a full authentication system.

## CV Upload To Agent Response Data Flow

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant CV as CV API
  participant Store as Local Storage
  participant DB as SQLite
  participant Vec as Vector Store
  participant A as Assistant API
  participant LLM as LLM/Fallback

  U->>FE: Select PDF/DOCX CV
  FE->>CV: POST /api/cv/upload<br/>file + x-careerpilot-user-id
  CV->>Store: Save original file
  CV->>CV: Extract text from PDF/DOCX
  CV->>Store: Save processed text and section JSON
  CV->>DB: Insert CVProfile metadata
  CV->>Vec: Embed sections and write vector index
  CV-->>FE: cv_id, filename, file_type, skills

  U->>FE: Ask career question
  FE->>A: POST /api/assistant/query<br/>cv_id, session_id, question
  A->>DB: Validate CV ownership
  A->>DB: Save user message
  A->>Vec: Retrieve top CV chunks for question
  A->>LLM: Send question + retrieved CV context + history
  LLM-->>A: Answer, or rule-based fallback
  A->>DB: Save assistant message
  A-->>FE: answer, retrieved_context, sources, provider, fallback_used
  FE-->>U: Render assistant answer
```

The upload response gives the frontend a `cv_id`. That ID becomes the join key
for assistant questions, fit scoring, RAG retrieval, and personalized job
recommendations.

## RAG Pipeline

RAG is built around local CV content rather than a remote vector database.

1. The frontend uploads a CV to `POST /api/cv/upload`.
2. `cv_extraction_service` extracts readable text from PDF or DOCX.
3. `cv_chunking_service.save_processed_cv` writes:
   - `backend/app/storage/processed_cvs/{cv_id}.txt`
   - `backend/app/storage/processed_cvs/{cv_id}_sections.json`
4. The section splitter groups content into `skills`, `education`,
   `experience`, `projects`, and `other`.
5. `vector_store_service.build_cv_rag_index` embeds section text through
   `embedding_service`.
6. The vector store writes:
   - `backend/app/storage/vector_db/{cv_id}.json`
   - `backend/app/storage/vector_db/{cv_id}_embeddings.npy`
7. Assistant queries call `retrieve_relevant_chunks(cv_id, query, top_k=3)`.
8. Retrieved chunks become `retrieved_context` and `sources` in the assistant
   response.

```mermaid
flowchart TD
  Upload[CV Upload] --> Extract[Extract Text]
  Extract --> Sections[Split Into CV Sections]
  Sections --> SaveText[Save Text + Sections JSON]
  Sections --> Embeddings[Generate Embeddings]
  Embeddings --> Index[Save Vector Index]

  Question[Assistant Question] --> QueryEmbed[Embed Query]
  QueryEmbed --> Similarity[Cosine Similarity]
  Index --> Similarity
  Similarity --> TopChunks[Top Relevant Chunks]
  TopChunks --> Prompt[Prompt With CV Context]
  Prompt --> Answer[LLM Answer or Rule-Based Fallback]
```

If the vector index is missing when an assistant query arrives, the assistant
service attempts to rebuild it from the saved CV section JSON before answering.

## Assistant And Agent Response Flow

`POST /api/assistant/query` coordinates the agent-like assistant behavior.

Request inputs:

- `cv_id`: uploaded CV identifier.
- `session_id`: conversation identifier.
- `question`: user question.
- `job_id`: optional tracked job context for readiness or skill-gap questions.
- `x-careerpilot-user-id`: local profile identifier.

Processing steps:

1. Validate that the CV belongs to the current `x-careerpilot-user-id`.
2. Persist the user message to `AssistantSession`.
3. Load recent conversation history from SQLite, with in-memory cache as a
   fallback.
4. Retrieve the top CV chunks from the vector store.
5. Optionally load tracked job data when `job_id` is supplied.
6. Generate an answer through the provider chain:
   - GitHub Models when `GITHUB_MODELS_TOKEN` is configured.
   - OpenRouter when `OPENROUTER_API_KEY` is configured.
   - Rule-based fallback when no provider is available or provider generation
     fails.
7. Persist the assistant answer to `AssistantSession`.
8. Return the answer, retrieved context, source chunks, provider name, and
   fallback flag.

## Job Search And Fit Scoring

### Job Search Flow

`GET /api/jobs/search` searches live job sources and optionally personalizes
results with CV skills.

```mermaid
flowchart TD
  FE[Frontend Search Form] --> Jobs[GET /api/jobs/search]
  Jobs --> Header[Validate x-careerpilot-user-id]
  Jobs --> HasCV{cv_id provided?}
  HasCV -- No --> Live[Fetch Live Jobs]
  HasCV -- Yes --> CVSkills[Load CV Text and Extract Skills]
  CVSkills --> Live
  Live --> Sources[Adzuna + Arbeitnow + Remotive]
  Sources --> Normalize[Normalize To JobCard]
  Normalize --> Personalize{Have CV skills?}
  Personalize -- No --> General[Return jobs with fit_score null]
  Personalize -- Yes --> Enrich[Compute per-job fit score]
  Enrich --> Sort[Sort by fit score]
  Sort --> Response[Return personalized jobs]
  General --> Response
```

Job source behavior:

- Adzuna is used when `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` are configured.
- Arbeitnow is used as a no-key live source.
- Remotive is kept as another no-key source.
- Results are normalized into the shared `JobCard` shape and deduplicated by
  URL or `(company, role)`.

When `cv_id` is missing, the frontend receives general job results with
`personalized=false` and `fit_scores_enabled=false`. The UI should not display a
fit score in that state.

### Fit Scoring Flow

`POST /api/fit/score` compares a processed CV against a specific job posting.

```mermaid
flowchart LR
  FE[Frontend] --> FitAPI[POST /api/fit/score]
  FitAPI --> LoadCV[Load processed CV text]
  LoadCV --> Score[calculate_fit_score]
  Score --> Skills[Skill overlap]
  Score --> Keywords[Keyword overlap]
  Skills --> Weighted[Weighted final score]
  Keywords --> Weighted
  Weighted --> FitResponse[fit_score, skill_score,<br/>keyword_score, matched/missing skills]
```

The fit score service:

- extracts skills from the CV and job posting,
- calculates explicit skill overlap,
- calculates keyword overlap,
- combines the weighted components,
- returns matched skills, missing skills, matched keywords, and an explanation.

## Tracker Data Flow

The tracker stores selected jobs and their application state in SQLite.

```mermaid
sequenceDiagram
  participant FE as Frontend Tracker UI
  participant API as Tracker API
  participant DB as SQLite Applications

  FE->>API: POST /api/tracker/applications<br/>job details + fit score
  API->>API: Validate x-careerpilot-user-id
  API->>DB: Insert Application row
  API-->>FE: Saved application

  FE->>API: GET /api/tracker/applications
  API->>DB: Query applications for user
  API-->>FE: Application list

  FE->>API: PATCH /api/tracker/applications/{id}/status
  API->>DB: Update status and updated_at
  API-->>FE: Updated application

  FE->>API: DELETE /api/tracker/applications/{id}
  API->>DB: Delete matching user-owned row
  API-->>FE: Deletion message
```

Tracker records are keyed by the anonymous user header and include:

- external `job_id`
- role, company, location, deadline, and job URL
- saved job description and required skills
- application status
- fit score
- notes and timestamps

The common frontend flow is:

1. User searches jobs.
2. User reviews a job and optional fit score.
3. Frontend saves the job to `/api/tracker/applications`.
4. Tracker board loads saved jobs through `GET /api/tracker/applications`.
5. Status changes update the same record through the status endpoint.

## Persistence Summary

| Data | Stored In | Written By | Read By |
| --- | --- | --- | --- |
| Uploaded CV file | `storage/uploaded_cvs/` | CV upload API | Audit/debug, original file retention |
| Extracted CV text | `storage/processed_cvs/{cv_id}.txt` | CV chunking service | Fit scoring, job personalization, RAG rebuild |
| CV sections | `storage/processed_cvs/{cv_id}_sections.json` | CV chunking service | RAG build/rebuild, CV section endpoint |
| Vector metadata | `storage/vector_db/{cv_id}.json` | Vector store service | Assistant retrieval |
| Vector embeddings | `storage/vector_db/{cv_id}_embeddings.npy` | Vector store service | Assistant retrieval |
| CV metadata | SQLite `cv_profiles` | CV upload API | Ownership validation, job personalization |
| Assistant messages | SQLite `assistant_sessions` | Assistant service | Conversation history |
| Applications | SQLite `applications` | Tracker API | Tracker board, optional assistant job context |

## Operational Notes

- The backend creates SQLite tables at startup.
- CORS is controlled by `CORS_ORIGINS`; the local default is permissive.
- LLM provider status is available at `GET /api/health/providers`.
- The assistant can answer with a rule-based fallback when no LLM key is
  configured.
- Job search can return a successful `200` response with empty jobs and an
  `error` or `message` field when live sources fail or no results match.

