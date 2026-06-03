# CareerPilot API Documentation

> Complete API reference for CareerPilot backend services.

---

## Table of Contents

- [General Information](#general-information)
- [Tracker API](#tracker-api) - Job Application Management
- [Todo API](#todo-api) - Task Management
- [Calendar API](#calendar-api) - Deadline & Event Management
- [CV API](#cv-api) - Resume Upload & Processing
- [Fit Score API](#fit-score-api) - CV-Job Matching
- [Skills Fit API](#skills-fit-api) - Direct Skills Comparison
- [Job Search API](#job-search-api) - Job Discovery
- [Assistant API](#assistant-api) - AI Career Assistant
- [Frontend Integration](#frontend-integration)
- [Testing the API](#testing-the-api)

---

## General Information

### Base URL

```
http://localhost:8000/api
```

### Authentication

**No authentication required** - The current implementation uses local SQLite database without authentication middleware.

### Response Format Standards

All endpoints return JSON responses with consistent structure:

**Success Response:**
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**Error Response (HTTP 404):**
```json
{
  "detail": "Resource not found"
}
```

**Error Response (HTTP 500):**
```json
{
  "detail": "Internal server error message"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource doesn't exist |
| 413 | Payload Too Large - File exceeds size limit |
| 500 | Internal Server Error |

---

## Tracker API

Job application tracking with Kanban-style status management.

### Base Path
```
/api/tracker
```

---

### Create Application

Add a new job application to the tracker.

**Endpoint:** `POST /api/tracker/applications`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "job_id": "string (required)",
  "role": "string (required)",
  "company": "string (required)",
  "location": "string (optional)",
  "status": "string (optional, default: 'Applied')",
  "fit_score": "number (optional, 0-100)",
  "job_url": "string (optional)",
  "notes": "string (optional)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `job_id` | string | Yes | External job ID from job search |
| `role` | string | Yes | Job title/position |
| `company` | string | Yes | Company name |
| `location` | string | No | Job location (e.g., "Remote", "New York") |
| `status` | string | No | Status: `Applied`, `Interviewing`, `Offer`, `Rejected` |
| `fit_score` | float | No | Match percentage (0-100) |
| `job_url` | string | No | Link to job posting |
| `notes` | string | No | Additional notes |

**Example:**
```json
{
  "job_id": "job_123",
  "role": "Frontend Developer",
  "company": "TechCorp",
  "location": "Remote",
  "status": "Applied",
  "fit_score": 85.5,
  "job_url": "https://example.com/jobs/123"
}
```

**Success Response (201):**
```json
{
  "id": 1,
  "job_id": "job_123",
  "role": "Frontend Developer",
  "company": "TechCorp",
  "location": "Remote",
  "status": "Applied",
  "fit_score": 85.5,
  "job_url": "https://example.com/jobs/123",
  "notes": null,
  "created_at": "2026-06-01T10:00:00",
  "updated_at": "2026-06-01T10:00:00"
}
```

---

### Get All Applications

Retrieve all tracked job applications.

**Endpoint:** `GET /api/tracker/applications`

**Success Response (200):**
```json
[
  {
    "id": 1,
    "job_id": "job_123",
    "role": "Frontend Developer",
    "company": "TechCorp",
    "location": "Remote",
    "status": "Applied",
    "fit_score": 85.5,
    "job_url": "https://example.com/jobs/123",
    "notes": null,
    "created_at": "2026-06-01T10:00:00",
    "updated_at": "2026-06-01T10:00:00"
  }
]
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique application ID |
| `job_id` | string | External job reference |
| `role` | string | Job title |
| `company` | string | Company name |
| `location` | string | Job location |
| `status` | string | Current status |
| `fit_score` | float | Match percentage |
| `job_url` | string | Job posting URL |
| `notes` | string | Additional notes |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |

---

### Update Application Status

Move application to different Kanban column.

**Endpoint:** `PATCH /api/tracker/applications/{application_id}/status`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `application_id` | integer | Application ID |

**Request Body:**
```json
{
  "status": "string (required)"
}
```

**Valid Status Values:** `Applied`, `Interviewing`, `Offer`, `Rejected`

**Example:**
```json
{
  "status": "Interviewing"
}
```

**Success Response (200):**
```json
{
  "id": 1,
  "job_id": "job_123",
  "role": "Frontend Developer",
  "company": "TechCorp",
  "location": "Remote",
  "status": "Interviewing",
  "fit_score": 85.5,
  "job_url": "https://example.com/jobs/123",
  "notes": null,
  "created_at": "2026-06-01T10:00:00",
  "updated_at": "2026-06-01T12:30:00"
}
```

**Error Response (404):**
```json
{
  "detail": "Application not found"
}
```

---

### Delete Application

Remove an application from the tracker.

**Endpoint:** `DELETE /api/tracker/applications/{application_id}`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `application_id` | integer | Application ID |

**Success Response (200):**
```json
{
  "message": "Application deleted"
}
```

**Error Response (404):**
```json
{
  "detail": "Application not found"
}
```

---

## Todo API

Task management with completion tracking and linking.

### Base Path
```
/api/todos
```

---

### Create Todo

Add a new task.

**Endpoint:** `POST /api/todos`

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "due_date": "string (optional, ISO date)",
  "linked_type": "string (optional, 'goal' or 'application')",
  "linked_id": "integer (optional)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Task title |
| `description` | string | No | Task details |
| `due_date` | string | No | Due date (YYYY-MM-DD) |
| `linked_type` | string | No | Link type: `goal` or `application` |
| `linked_id` | integer | No | ID of linked item |

**Example:**
```json
{
  "title": "Prepare for technical interview",
  "description": "Review system design patterns",
  "due_date": "2026-06-15",
  "linked_type": "application",
  "linked_id": 1
}
```

**Success Response (201):**
```json
{
  "id": 1,
  "title": "Prepare for technical interview",
  "description": "Review system design patterns",
  "is_completed": false,
  "due_date": "2026-06-15",
  "linked_type": "application",
  "linked_id": 1,
  "created_at": "2026-06-01T10:00:00"
}
```

---

### Get All Todos

Retrieve all tasks.

**Endpoint:** `GET /api/todos`

**Success Response (200):**
```json
[
  {
    "id": 1,
    "title": "Prepare for technical interview",
    "description": "Review system design patterns",
    "is_completed": false,
    "due_date": "2026-06-15",
    "linked_type": "application",
    "linked_id": 1,
    "created_at": "2026-06-01T10:00:00"
  }
]
```

---

### Get Todo Stats

Get completion statistics for progress tracking.

**Endpoint:** `GET /api/todos/stats`

**Success Response (200):**
```json
{
  "total": 10,
  "completed": 7,
  "remaining": 3,
  "progress_percentage": 70.0
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `total` | integer | Total number of todos |
| `completed` | integer | Completed todos count |
| `remaining` | integer | Pending todos count |
| `progress_percentage` | float | Completion percentage (0-100) |

---

### Update Todo

Modify an existing task (including marking complete).

**Endpoint:** `PATCH /api/todos/{todo_id}`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `todo_id` | integer | Todo ID |

**Request Body:**
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "is_completed": "boolean (optional)",
  "due_date": "string (optional)",
  "linked_type": "string (optional)",
  "linked_id": "integer (optional)"
}
```

**Example - Mark as Complete:**
```json
{
  "is_completed": true
}
```

**Example - Update Details:**
```json
{
  "title": "Updated task title",
  "due_date": "2026-06-20"
}
```

**Success Response (200):**
```json
{
  "id": 1,
  "title": "Updated task title",
  "description": "Review system design patterns",
  "is_completed": true,
  "due_date": "2026-06-20",
  "linked_type": "application",
  "linked_id": 1,
  "created_at": "2026-06-01T10:00:00"
}
```

---

### Delete Todo

Remove a task.

**Endpoint:** `DELETE /api/todos/{todo_id}`

**Success Response (200):**
```json
{
  "message": "Todo deleted"
}
```

---

## Calendar API

Deadline and event management with application linking.

### Base Path
```
/api/calendar
```

---

### Create Event

Add a new deadline or event.

**Endpoint:** `POST /api/calendar/events`

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "event_date": "string (required, ISO date)",
  "related_application_id": "integer (optional)",
  "linked_type": "string (optional)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Event title |
| `description` | string | No | Event details |
| `event_date` | string | Yes | Event date (YYYY-MM-DD) |
| `related_application_id` | integer | No | Link to application |
| `linked_type` | string | No | Type: `goal`, `application`, `general` |

**Example:**
```json
{
  "title": "Technical Interview",
  "description": "Round 2 with engineering team",
  "event_date": "2026-06-10",
  "related_application_id": 1,
  "linked_type": "application"
}
```

**Success Response (201):**
```json
{
  "id": 1,
  "title": "Technical Interview",
  "description": "Round 2 with engineering team",
  "event_date": "2026-06-10",
  "related_application_id": 1,
  "linked_type": "application",
  "created_at": "2026-06-01T10:00:00"
}
```

---

### Get All Events

Retrieve all calendar events sorted by date.

**Endpoint:** `GET /api/calendar/events`

**Success Response (200):**
```json
[
  {
    "id": 1,
    "title": "Technical Interview",
    "description": "Round 2 with engineering team",
    "event_date": "2026-06-10",
    "related_application_id": 1,
    "linked_type": "application",
    "created_at": "2026-06-01T10:00:00"
  }
]
```

---

### Delete Event

Remove an event.

**Endpoint:** `DELETE /api/calendar/events/{event_id}`

**Success Response (200):**
```json
{
  "message": "Event deleted"
}
```

---

## CV API

Resume upload, text extraction, and section parsing.

### Base Path
```
/api/cv
```

---

### Upload CV

Upload and process a resume file.

**Endpoint:** `POST /api/cv/upload`

**Request Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Resume file |

**Accepted Formats:** `.pdf`, `.docx`

**Maximum File Size:** 10 MB

**Example with JavaScript:**
```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch("http://localhost:8000/api/cv/upload", {
  method: "POST",
  body: formData,
});
```

**Success Response (200):**
```json
{
  "message": "CV uploaded and processed successfully",
  "cv_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "resume.pdf",
  "file_type": "pdf",
  "extracted_text": "John Doe\nSoftware Engineer\n..."
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Success message |
| `cv_id` | string | UUID for the uploaded CV |
| `filename` | string | Original filename |
| `file_type` | string | File extension (`pdf` or `docx`) |
| `extracted_text` | string | Extracted text content |

**Error Responses:**

*Unsupported File Type (400):*
```json
{
  "detail": "Only PDF and DOCX files are supported"
}
```

*Missing File (400):*
```json
{
  "detail": "A CV file is required"
}
```

*File Too Large (413):*
```json
{
  "detail": "Uploaded file is too large"
}
```

*Empty File (400):*
```json
{
  "detail": "Uploaded CV file is empty"
}
```

---

### Get CV Sections

Retrieve parsed sections from an uploaded CV.

**Endpoint:** `GET /api/cv/{cv_id}/sections`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `cv_id` | string | CV UUID from upload response |

**Success Response (200):**
```json
{
  "cv_id": "550e8400-e29b-41d4-a716-446655440000",
  "sections": {
    "experience": "Software Engineer at TechCorp...",
    "education": "BS Computer Science...",
    "skills": "Python, JavaScript, React..."
  }
}
```

**Error Response (404):**
```json
{
  "detail": "CV not found"
}
```

---

## Fit Score API

Calculate how well a CV matches a job posting.

### Base Path
```
/api/fit
```

---

### Calculate Fit Score

Compare uploaded CV against job description.

**Endpoint:** `POST /api/fit/score`

**Request Body:**
```json
{
  "cv_id": "string (required)",
  "job_posting": "string (required)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cv_id` | string | Yes | UUID from CV upload |
| `job_posting` | string | Yes | Full job description text |

**Example:**
```json
{
  "cv_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_posting": "We are looking for a Frontend Developer with experience in React, TypeScript, and modern CSS. 3+ years of experience required."
}
```

**Success Response (200):**
```json
{
  "cv_id": "550e8400-e29b-41d4-a716-446655440000",
  "fit_score": 75.5,
  "skill_score": 80.0,
  "keyword_score": 71.0,
  "matched_skills": ["React", "TypeScript", "JavaScript"],
  "missing_skills": ["GraphQL", "Testing"],
  "matched_keywords": ["Frontend", "Developer", "experience"],
  "explanation": "Your CV matches well with the job requirements..."
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `cv_id` | string | Input CV ID |
| `fit_score` | float | Overall match percentage |
| `skill_score` | float | Skill match component |
| `keyword_score` | float | Keyword match component |
| `matched_skills` | array | Skills found in both CV and job |
| `missing_skills` | array | Required skills not in CV |
| `matched_keywords` | array | Keywords found in both |
| `explanation` | string | Detailed explanation |

**Error Response (404):**
```json
{
  "detail": "CV not found"
}
```

---

## Skills Fit API

Direct comparison of skills without requiring CV upload.

### Base Path
```
/api/fit
```

---

### Calculate Skills Fit

Compare user skills against job requirements.

**Endpoint:** `POST /api/fit/skills/score`

**Request Body:**
```json
{
  "user_skills": ["string array (required)"],
  "job_skills": ["string array (required)"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_skills` | array[string] | Yes | Skills from user's CV/profile |
| `job_skills` | array[string] | Yes | Required skills from job listing |

**Example:**
```json
{
  "user_skills": ["React", "TypeScript", "JavaScript", "Node.js", "Python"],
  "job_skills": ["React", "TypeScript", "GraphQL", "Testing"]
}
```

**Success Response (200):**
```json
{
  "fit_score": 50.0,
  "matched_skills": ["React", "TypeScript"],
  "missing_skills": ["GraphQL", "Testing"],
  "match_count": 2,
  "total_required": 4
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `fit_score` | float | Match percentage (0-100) |
| `matched_skills` | array | Skills in both lists |
| `missing_skills` | array | Required skills not matched |
| `match_count` | integer | Number of matched skills |
| `total_required` | integer | Total job-required skills |

---

## Job Search API

Search for jobs using natural language queries.

### Base Path
```
/api/jobs
```

---

### Search Jobs

Find jobs matching a natural language query.

**Endpoint:** `POST /api/jobs/search`

**Request Body:**
```json
{
  "query": "string (required)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Natural language search (e.g., "React developer remote") |

**Example:**
```json
{
  "query": "Frontend Developer Remote React TypeScript"
}
```

**Success Response (200):**
```json
{
  "query": "Frontend Developer Remote React TypeScript",
  "source": "Remotive",
  "total_results": 3,
  "jobs": [
    {
      "job_id": "job_abc123",
      "role": "Senior Frontend Developer",
      "company": "TechCorp",
      "location": "Remote",
      "deadline": "2026-06-30",
      "salary": "$120k - $150k",
      "required_skills": ["React", "TypeScript", "Node.js"],
      "description": "We are looking for an experienced Frontend Developer...",
      "job_url": "https://remotive.com/job/123",
      "source": "Remotive"
    }
  ],
  "is_fallback": false,
  "message": null
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `query` | string | Original search query |
| `source` | string | Data source (e.g., "Remotive", "Fallback Demo") |
| `total_results` | integer | Number of results |
| `jobs` | array | List of job cards |
| `is_fallback` | boolean | True if using demo data |
| `message` | string | Status or warning message |

**Job Card Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `job_id` | string | Unique job ID |
| `role` | string | Job title |
| `company` | string | Company name |
| `location` | string | Job location |
| `deadline` | string | Application deadline |
| `salary` | string | Salary range |
| `required_skills` | array | Extracted skills |
| `description` | string | Job description (~500 chars) |
| `job_url` | string | Link to posting |

---

## Assistant API

AI-powered career assistant with CV context.

### Base Path
```
/api/assistant
```

---

### Ask Assistant

Get AI-powered career advice using CV context.

**Endpoint:** `POST /api/assistant/query`

**Request Body:**
```json
{
  "cv_id": "string (required)",
  "session_id": "string (required)",
  "question": "string (required)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cv_id` | string | Yes | UUID from CV upload |
| `session_id` | string | Yes | Session ID for conversation memory |
| `question` | string | Yes | Career-related question |

**Example:**
```json
{
  "cv_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "user_123_session_abc",
  "question": "What skills should I focus on to become a senior developer?"
}
```

**Success Response (200):**
```json
{
  "session_id": "user_123_session_abc",
  "answer": "Based on your CV, you already have strong fundamentals...",
  "retrieved_context": "Relevant sections from your CV...",
  "sources": [
    {
      "section": "experience",
      "text": "Software Engineer at TechCorp...",
      "score": 0.95
    }
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `session_id` | string | Session identifier |
| `answer` | string | AI-generated response |
| `retrieved_context` | string | Relevant CV context used |
| `sources` | array | CV sections referenced |

**Error Response (404):**
```json
{
  "detail": "CV not found. Please upload a CV first or build the RAG index."
}
```

---

## Frontend Integration

### Fetch API Example

```javascript
const API_BASE = 'http://localhost:8000/api';

// Create a todo
async function createTodo(title, description) {
  const response = await fetch(`${API_BASE}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  return response.json();
}

// Get all todos
async function getTodos() {
  const response = await fetch(`${API_BASE}/todos`);
  return response.json();
}

// Update todo status
async function toggleTodo(todoId, isCompleted) {
  const response = await fetch(`${API_BASE}/todos/${todoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_completed: isCompleted })
  });
  return response.json();
}

// Upload CV
async function uploadCV(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/cv/upload`, {
    method: 'POST',
    body: formData
  });
  return response.json();
}
```

### Axios Example

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Create application
async function createApplication(data) {
  const response = await api.post('/tracker/applications', data);
  return response.data;
}

// Update application status
async function updateStatus(applicationId, status) {
  const response = await api.patch(`/tracker/applications/${applicationId}/status`, { status });
  return response.data;
}

// Get todo stats
async function getTodoStats() {
  const response = await api.get('/todos/stats');
  return response.data;
}
```

### React Query Example

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'http://localhost:8000/api';

// Fetch todos
export function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/todos`);
      return response.json();
    },
  });
}

// Create todo mutation
export function useCreateTodo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`${API_BASE}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['todos']);
      queryClient.invalidateQueries(['todoStats']);
    },
  });
}
```

---

## Testing the API

### Using cURL

**Create Todo:**
```bash
curl -X POST http://localhost:8000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test todo","description":"Testing"}'
```

**Get All Todos:**
```bash
curl http://localhost:8000/api/todos
```

**Get Todo Stats:**
```bash
curl http://localhost:8000/api/todos/stats
```

**Create Application:**
```bash
curl -X POST http://localhost:8000/api/tracker/applications \
  -H "Content-Type: application/json" \
  -d '{"job_id":"test","role":"Developer","company":"TestCo"}'
```

**Update Application Status:**
```bash
curl -X PATCH http://localhost:8000/api/tracker/applications/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"Interviewing"}'
```

**Search Jobs:**
```bash
curl -X POST http://localhost:8000/api/jobs/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Frontend Developer React"}'
```

**Upload CV:**
```bash
curl -X POST http://localhost:8000/api/cv/upload \
  -F "file=@resume.pdf"
```

### Using Postman

1. **Create a new request**
2. **Set the method** (GET, POST, PATCH, DELETE)
3. **Enter the URL** (e.g., `http://localhost:8000/api/todos`)
4. **For POST/PATCH**: 
   - Go to Body tab
   - Select "raw"
   - Set type to "JSON"
   - Enter request body
5. **Click Send**

### Interactive API Docs

FastAPI provides automatic documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Environment Variables

Configure the backend via `.env` file in `backend/`:

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `*` | Allowed origins (comma-separated) |
| `INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE` | `true` | Include CV text in upload response |
| `FIT_SCORE_SKILL_WEIGHT` | `0.75` | Weight for skill matching |
| `FIT_SCORE_KEYWORD_WEIGHT` | `0.25` | Weight for keyword matching |

**Example `.env`:**
```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE=true
FIT_SCORE_SKILL_WEIGHT=0.75
FIT_SCORE_KEYWORD_WEIGHT=0.25
```

---

## Database

- **Type:** SQLite
- **Location:** `backend/app/storage/careerpilot.db`
- **ORM:** SQLAlchemy
- **Auto-migration:** Tables are created automatically on first run

---

## Running the Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload
```

Server runs at: **http://localhost:8000**
