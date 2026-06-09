# CareerPilot Backend API Guide

This guide documents the backend endpoints most commonly used by the frontend:
CV upload, job search, and fit scoring.

Base URLs:

- API routes: `http://127.0.0.1:8000/api`
- Health check: `http://127.0.0.1:8000/health`
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Frontend Request Basics

### Required Profile Header

Most user-specific endpoints require an anonymous profile header:

```http
x-careerpilot-user-id: cp-local-user-123
```

Use a stable value for the current browser profile. CV upload, CV section lookup,
and personalized job search use this header to keep CVs tied to the same local
CareerPilot profile.

### JSON Headers

For JSON requests:

```http
Content-Type: application/json
```

Do not set `Content-Type` manually for file uploads with `FormData`; the browser
will add the correct `multipart/form-data` boundary.

### Common Error Format

FastAPI errors return JSON:

```json
{
  "detail": "Human-readable error message"
}
```

Validation errors use HTTP `422` and include a structured `detail` array from
FastAPI/Pydantic.

## Running the Backend Locally

From the repo root, start both frontend and backend:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

To run only the backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If the virtual environment does not exist yet:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
```

Verify the API is up:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "success",
  "message": "CareerPilot backend is healthy"
}
```

## CV Upload

Uploads a PDF or DOCX resume, extracts text, stores the processed CV, extracts
skills, and builds the local RAG index. The returned `cv_id` is used by later
features such as fit scoring and personalized job recommendations.

Endpoint:

```http
POST /api/cv/upload
```

Full URL:

```text
http://127.0.0.1:8000/api/cv/upload
```

Headers:

```http
x-careerpilot-user-id: cp-local-user-123
```

Request format:

- `multipart/form-data`
- Field name: `file`
- Allowed file types: `.pdf`, `.docx`
- Maximum size: 10 MB

JavaScript example:

```js
const API_BASE = "http://127.0.0.1:8000/api";
const userId = "cp-local-user-123";

async function uploadCv(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/cv/upload`, {
    method: "POST",
    headers: {
      "x-careerpilot-user-id": userId,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error((await response.json()).detail ?? "CV upload failed");
  }

  return response.json();
}
```

cURL example:

```bash
curl -X POST "http://127.0.0.1:8000/api/cv/upload" \
  -H "x-careerpilot-user-id: cp-local-user-123" \
  -F "file=@resume.pdf"
```

Success response, `200`:

```json
{
  "message": "CV uploaded and processed successfully",
  "cv_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "resume.pdf",
  "file_type": "pdf",
  "extracted_text": "Jane Doe\nFrontend Developer\nSkills: React, TypeScript...",
  "skills": ["react", "typescript", "javascript"]
}
```

Response fields:

| Field | Type | Notes |
| --- | --- | --- |
| `message` | string | Human-readable success message. |
| `cv_id` | string | Store this for future API calls. |
| `filename` | string | Original uploaded filename. |
| `file_type` | string | `pdf` or `docx`. |
| `extracted_text` | string or omitted | Included unless `INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE=false`. |
| `skills` | string[] | Skills extracted from the CV text. |

Possible error responses:

Unsupported or missing file, `400`:

```json
{
  "detail": "Please upload a valid CV file in PDF or DOCX format."
}
```

Empty or unreadable CV, `400`:

```json
{
  "detail": "Could not extract text from the uploaded CV."
}
```

File too large, `413`:

```json
{
  "detail": "Uploaded CV file is too large. Maximum size is 10 MB."
}
```

Missing profile header, `400`:

```json
{
  "detail": "Anonymous user ID is missing. Please refresh CareerPilot and try again."
}
```

Processing failure, `500`:

```json
{
  "detail": "Failed to process uploaded CV"
}
```

## Job Search

Searches live job sources by query and location. This endpoint works without a
CV, but fit scores are only returned when a valid `cv_id` for the same
`x-careerpilot-user-id` is provided.

Endpoint:

```http
GET /api/jobs/search
```

Full URL:

```text
http://127.0.0.1:8000/api/jobs/search
```

Headers:

```http
x-careerpilot-user-id: cp-local-user-123
```

Query parameters:

| Parameter | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `query` | string | No | `software internship` | Search text, such as `frontend developer`. |
| `location` | string | No | `remote` | Location filter. |
| `limit` | integer | No | `10` | Backend caps this at `50`. |
| `cv_id` | string | No | none | Enables personalized fit scores when valid. |

This endpoint does not accept a JSON request body. Send search values as query
parameters.

JavaScript example:

```js
const API_BASE = "http://127.0.0.1:8000/api";
const userId = "cp-local-user-123";

async function searchJobs({ query, location = "remote", limit = 10, cvId }) {
  const params = new URLSearchParams({
    query,
    location,
    limit: String(limit),
  });

  if (cvId) {
    params.set("cv_id", cvId);
  }

  const response = await fetch(`${API_BASE}/jobs/search?${params}`, {
    headers: {
      "x-careerpilot-user-id": userId,
    },
  });

  if (!response.ok) {
    throw new Error((await response.json()).detail ?? "Job search failed");
  }

  return response.json();
}
```

cURL example:

```bash
curl "http://127.0.0.1:8000/api/jobs/search?query=frontend%20developer&location=remote&limit=5" \
  -H "x-careerpilot-user-id: cp-local-user-123"
```

Personalized cURL example:

```bash
curl "http://127.0.0.1:8000/api/jobs/search?query=react&location=remote&limit=5&cv_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "x-careerpilot-user-id: cp-local-user-123"
```

Success response without CV, `200`:

```json
{
  "jobs": [
    {
      "job_id": "remotive-12345",
      "role": "Frontend Engineer",
      "company": "ExampleCo",
      "location": "Remote",
      "deadline": null,
      "salary": "Not listed",
      "required_skills": ["react", "typescript", "css"],
      "description": "We are looking for a frontend engineer...",
      "job_url": "https://example.com/jobs/frontend-engineer",
      "source": "Remotive",
      "is_live": true,
      "fetched_at": "2026-06-03T10:30:00.000000",
      "fit_score": null,
      "matched_skills": [],
      "missing_skills": [],
      "reason": null
    }
  ],
  "total": 1,
  "is_live": true,
  "source": "Remotive",
  "error": null,
  "requires_cv": false,
  "message": "Showing general live jobs. Upload a CV to get personalized fit scores.",
  "personalized": false,
  "fit_scores_enabled": false
}
```

Success response with valid CV, `200`:

```json
{
  "jobs": [
    {
      "job_id": "remotive-12345",
      "role": "Frontend Engineer",
      "company": "ExampleCo",
      "location": "Remote",
      "deadline": null,
      "salary": "Not listed",
      "required_skills": ["react", "typescript", "css"],
      "description": "We are looking for a frontend engineer...",
      "job_url": "https://example.com/jobs/frontend-engineer",
      "source": "Remotive",
      "is_live": true,
      "fetched_at": "2026-06-03T10:30:00.000000",
      "fit_score": 76.5,
      "matched_skills": ["react", "typescript"],
      "missing_skills": ["css"],
      "reason": "Matched 2 of 3 required skills."
    }
  ],
  "total": 1,
  "is_live": true,
  "source": "Remotive",
  "error": null,
  "requires_cv": false,
  "message": null,
  "personalized": true,
  "fit_scores_enabled": true
}
```

No jobs or upstream source issue, `200`:

```json
{
  "jobs": [],
  "total": 0,
  "is_live": false,
  "source": "Remotive",
  "error": "No jobs found matching your criteria. Try a different search.",
  "requires_cv": false,
  "message": "Showing general live jobs. Upload a CV to get personalized fit scores.",
  "personalized": false,
  "fit_scores_enabled": false
}
```

Missing profile header, `200` for this endpoint:

```json
{
  "jobs": [],
  "total": 0,
  "is_live": false,
  "source": null,
  "error": null,
  "requires_cv": true,
  "message": "Anonymous user ID is missing. Please refresh CareerPilot and try again.",
  "personalized": false,
  "fit_scores_enabled": false
}
```

Invalid or unowned CV, `200` for this endpoint:

```json
{
  "jobs": [],
  "total": 0,
  "is_live": false,
  "source": null,
  "error": null,
  "requires_cv": true,
  "message": "This CV does not belong to the current CareerPilot profile.",
  "personalized": false,
  "fit_scores_enabled": false
}
```

Frontend note: only show per-job `fit_score` when `fit_scores_enabled` is `true`.
When it is `false`, `fit_score` is intentionally `null`.

## Fit Scoring

Calculates how well an uploaded CV matches a job description. Use this when the
frontend has a specific job posting and wants a detailed CV-to-job score.

Endpoint:

```http
POST /api/fit/score
```

Full URL:

```text
http://127.0.0.1:8000/api/fit/score
```

Headers:

```http
Content-Type: application/json
```

Request body:

```json
{
  "cv_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_posting": "We need a frontend engineer with React, TypeScript, CSS, testing, and REST API experience."
}
```

Request fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `cv_id` | string | Yes | ID returned by `POST /api/cv/upload`. |
| `job_posting` | string | Yes | Full job description or requirement text. |

JavaScript example:

```js
const API_BASE = "http://127.0.0.1:8000/api";

async function scoreFit(cvId, jobPosting) {
  const response = await fetch(`${API_BASE}/fit/score`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cv_id: cvId,
      job_posting: jobPosting,
    }),
  });

  if (!response.ok) {
    throw new Error((await response.json()).detail ?? "Fit scoring failed");
  }

  return response.json();
}
```

cURL example:

```bash
curl -X POST "http://127.0.0.1:8000/api/fit/score" \
  -H "Content-Type: application/json" \
  -d '{"cv_id":"550e8400-e29b-41d4-a716-446655440000","job_posting":"We need a frontend engineer with React, TypeScript, CSS, testing, and REST API experience."}'
```

Success response, `200`:

```json
{
  "cv_id": "550e8400-e29b-41d4-a716-446655440000",
  "fit_score": 72.5,
  "skill_score": 80.0,
  "keyword_score": 50.0,
  "matched_skills": ["react", "typescript", "rest"],
  "missing_skills": ["testing", "css"],
  "matched_keywords": ["frontend", "engineer", "api"],
  "explanation": "Moderate match. The candidate matches react, typescript, rest. Missing or weaker areas include testing, css."
}
```

Response fields:

| Field | Type | Notes |
| --- | --- | --- |
| `cv_id` | string | Echoes the requested CV ID. |
| `fit_score` | number | Overall score from `0` to `100`. |
| `skill_score` | number | Score from explicit skill overlap. |
| `keyword_score` | number | Score from broader keyword overlap. |
| `matched_skills` | string[] | Skills found in both CV and job posting. |
| `missing_skills` | string[] | Job skills not found in the CV. |
| `matched_keywords` | string[] | Shared non-skill keywords. |
| `explanation` | string | Human-readable summary for the UI. |

Possible error responses:

Unknown CV, `404`:

```json
{
  "detail": "CV not found"
}
```

Missing required fields, `422`:

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "job_posting"],
      "msg": "Field required",
      "input": {
        "cv_id": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  ]
}
```

Empty string field, `422`:

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "cv_id"],
      "msg": "String should have at least 1 character",
      "input": ""
    }
  ]
}
```

## Suggested Frontend Flow

1. Generate or read a stable anonymous user ID in the browser.
2. Upload a CV with `POST /api/cv/upload` and save the returned `cv_id`.
3. Search general jobs with `GET /api/jobs/search`.
4. Search personalized jobs by adding `cv_id` to the job search query string.
5. For a selected job, call `POST /api/fit/score` with the saved `cv_id` and the job description.

Minimal flow example:

```js
const userId = localStorage.getItem("careerpilotUserId") ?? crypto.randomUUID();
localStorage.setItem("careerpilotUserId", userId);

const uploadResult = await uploadCv(file);
const cvId = uploadResult.cv_id;

const jobs = await searchJobs({
  query: "react developer",
  location: "remote",
  limit: 10,
  cvId,
});

const firstJob = jobs.jobs[0];
const score = await scoreFit(cvId, firstJob.description);
```

## Testing Checklist

Use these checks before wiring a frontend screen:

1. Backend health:

   ```powershell
   Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
   ```

2. Swagger docs:

   Open `http://127.0.0.1:8000/docs`.

3. Upload a sample PDF or DOCX:

   ```bash
   curl -X POST "http://127.0.0.1:8000/api/cv/upload" \
     -H "x-careerpilot-user-id: cp-local-user-123" \
     -F "file=@resume.pdf"
   ```

4. Copy the returned `cv_id`.

5. Search personalized jobs:

   ```bash
   curl "http://127.0.0.1:8000/api/jobs/search?query=react&location=remote&limit=5&cv_id=YOUR_CV_ID" \
     -H "x-careerpilot-user-id: cp-local-user-123"
   ```

6. Score a job posting:

   ```bash
   curl -X POST "http://127.0.0.1:8000/api/fit/score" \
     -H "Content-Type: application/json" \
     -d '{"cv_id":"YOUR_CV_ID","job_posting":"React TypeScript frontend engineer role with REST API experience."}'
   ```

## Environment Notes

Useful backend environment variables in `backend/.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CORS_ORIGINS` | `*` | Comma-separated frontend origins. Example: `http://localhost:3000,http://127.0.0.1:3000`. |
| `INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE` | `true` | Set to `false` to omit `extracted_text` from CV upload responses. |
| `FIT_SCORE_SKILL_WEIGHT` | `0.75` | Weight for direct skill matching. |
| `FIT_SCORE_KEYWORD_WEIGHT` | `0.25` | Weight for keyword matching. |
