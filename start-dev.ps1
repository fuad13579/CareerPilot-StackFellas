param()

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $Root "frontend"
$BackendDir  = Join-Path $Root "backend"
$VenvPython  = Join-Path $BackendDir ".venv\Scripts\python.exe"
$BackendLog  = Join-Path $Root "backend-dev.out.log"

if (-not (Test-Path $FrontendDir)) { throw "Frontend directory not found: $FrontendDir" }
if (-not (Test-Path $BackendDir))  { throw "Backend directory not found: $BackendDir" }
if (-not (Test-Path $VenvPython))  { throw "Venv python not found: $VenvPython (run: python -m venv backend\.venv)" }

# --- Backend (uvicorn via venv, fully detached) ---
Start-Process -FilePath $VenvPython -ArgumentList @(
  "-m", "uvicorn",
  "app.main:app",
  "--host", "127.0.0.1",
  "--port", "8000"
) -WorkingDirectory $BackendDir -WindowStyle Hidden `
  -RedirectStandardOutput $BackendLog `
  -RedirectStandardError  (Join-Path $Root "backend-dev.err.log")

# --- Frontend (next dev, fully detached) ---
Start-Process -FilePath "C:\Program Files\nodejs\npm.cmd" -ArgumentList @(
  "run", "dev"
) -WorkingDirectory $FrontendDir -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $Root "frontend-dev.out.log") `
  -RedirectStandardError  (Join-Path $Root "frontend-dev.err.log")

# Give uvicorn a moment to bind the port before printing
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "✅ Started CareerPilot dev servers (detached)."
Write-Host "   Frontend → http://localhost:3000"
Write-Host "   Backend  → http://127.0.0.1:8000"
Write-Host "   Logs     → backend-dev.{out,err}.log, frontend-dev.{out,err}.log"
Write-Host ""
Write-Host "Stop them with:  .\dev-down.ps1"
