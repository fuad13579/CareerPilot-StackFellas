# CareerPilot Backend

This backend provides the FastAPI foundation for the CareerPilot hackathon prototype.

## Configuration

The app reads `CORS_ORIGINS` from the environment.

- Default: `*`
- Example for local frontend development:
  ```powershell
  $env:CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
  ```

When `CORS_ORIGINS=*`, credentials are disabled. When explicit origins are provided, credentials are enabled automatically.

The upload API also supports:

- `INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE`
  Default: `true`
  Set to `false` if you do not want `extracted_text` returned in the upload response.

The fit score engine also supports:

- `FIT_SCORE_SKILL_WEIGHT`
  Default: `0.75`
- `FIT_SCORE_KEYWORD_WEIGHT`
  Default: `0.25`
- `FIT_SCORE_COMMON_SKILLS`
  Optional comma-separated override list for recognized skills

## Local setup

1. Go to the backend folder:
   ```powershell
   cd backend
   ```

2. Create a virtual environment:
   ```powershell
   python -m venv .venv
   ```

3. Activate the virtual environment:

   Windows PowerShell:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   Git Bash:
   ```bash
   source .venv/Scripts/activate
   ```

4. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

5. Run the backend:
   ```powershell
   uvicorn app.main:app --reload
   ```

6. Test the health endpoint:
   ```powershell
   curl http://127.0.0.1:8000/health
   ```

7. Open Swagger docs:
   `http://127.0.0.1:8000/docs`

## CV Upload API

### Endpoint

- `POST /api/cv/upload`

### Supported file types

- `.pdf`
- `.docx`

### Behavior

- Accepts one uploaded CV file
- Streams the uploaded file to disk with a 10 MB size limit
- Saves the uploaded file to `backend/app/storage/uploaded_cvs/`
- Extracts readable text from the CV
- Saves extracted CV text to `backend/app/storage/processed_cvs/{cv_id}.txt`
- Saves sectioned CV data to `backend/app/storage/processed_cvs/{cv_id}_sections.json`
- Returns the extracted text in the API response
- Rejects unsupported file types with a `400` error

### Successful response

```json
{
  "message": "CV uploaded and processed successfully",
  "cv_id": "generated-id",
  "filename": "resume.pdf",
  "file_type": "pdf",
  "extracted_text": "Extracted CV text here..."
}
```

### Invalid file type response

Status code: `400`

```json
{
  "detail": "Only PDF and DOCX files are supported"
}
```

### Testing in Swagger

1. Run:
   ```powershell
   uvicorn app.main:app --reload
   ```
2. Open:
   `http://127.0.0.1:8000/docs`
3. Use `POST /api/cv/upload` and upload a `.pdf` or `.docx` file.

## RAG Core

The RAG prototype adds:

- CV section splitting into `skills`, `education`, `experience`, `projects`, and `other`
- Section-based chunk creation
- Local embeddings using `sentence-transformers` when available
- Automatic fallback to a lightweight `scikit-learn` hashing embedding if the transformer model cannot load
- Local JSON vector storage in `backend/app/storage/vector_db/`

### RAG endpoints

- `GET /api/cv/{cv_id}/sections`
- `POST /api/fit/score`
- `POST /api/rag/build`
- `POST /api/rag/retrieve`

## Fit Score Engine

The fit score engine adds a deterministic CV-to-job match score that:

- Extracts skills from the stored CV text
- Extracts required skills from the job posting text
- Calculates explicit skill overlap
- Calculates weighted keyword overlap
- Returns a final fit score from `0` to `100`
- Returns matched skills, missing skills, and an explanation

### Fit score endpoint

Endpoint:

- `POST /api/fit/score`

Request body:

```json
{
  "cv_id": "returned-cv-id",
  "job_posting": "We need a backend engineer with Python, FastAPI, Docker, AWS, and PostgreSQL experience."
}
```

Response:

```json
{
  "cv_id": "returned-cv-id",
  "fit_score": 72.5,
  "skill_score": 80.0,
  "keyword_score": 50.0,
  "matched_skills": ["docker", "fastapi", "python"],
  "missing_skills": ["aws", "postgresql"],
  "matched_keywords": ["api", "backend", "database"],
  "explanation": "Moderate match. The candidate matches docker, fastapi, python. Missing or weaker areas include aws, postgresql."
}
```

### Build the RAG index

Endpoint:

- `POST /api/rag/build`

Request body:

```json
{
  "cv_id": "returned-cv-id"
}
```

Response:

```json
{
  "message": "RAG index built successfully",
  "cv_id": "returned-cv-id",
  "total_chunks": 8,
  "sections_indexed": ["education", "experience", "projects", "skills"]
}
```

### Retrieve CV context

Endpoint:

- `POST /api/rag/retrieve`

Request body:

```json
{
  "cv_id": "returned-cv-id",
  "query": "What projects has this user worked on?",
  "top_k": 3
}
```

Response:

```json
{
  "cv_id": "returned-cv-id",
  "query": "What projects has this user worked on?",
  "retrieved_chunks": [
    {
      "section": "projects",
      "text": "Built a FastAPI backend for a hackathon app...",
      "score": 0.8731
    }
  ],
  "context": "Built a FastAPI backend for a hackathon app..."
}
```

### Testing flow in Swagger

1. Run the backend:
   ```powershell
   uvicorn app.main:app --reload
   ```
2. Open:
   `http://127.0.0.1:8000/docs`
3. Upload a CV with `POST /api/cv/upload`.
4. Copy the returned `cv_id`.
5. Check sections with `GET /api/cv/{cv_id}/sections`.
6. Build the index with `POST /api/rag/build`.
7. Retrieve context with `POST /api/rag/retrieve`.
