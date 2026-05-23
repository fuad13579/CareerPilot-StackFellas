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
- Saves the uploaded file to `backend/app/storage/uploaded_cvs/`
- Extracts readable text from the CV
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
