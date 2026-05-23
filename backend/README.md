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
