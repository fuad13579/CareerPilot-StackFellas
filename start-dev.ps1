param()

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $Root "frontend"
$BackendDir = Join-Path $Root "backend"

if (-not (Test-Path $FrontendDir)) {
  throw "Frontend directory not found: $FrontendDir"
}

if (-not (Test-Path $BackendDir)) {
  throw "Backend directory not found: $BackendDir"
}

Start-Process -FilePath "C:\Users\FUAD\anaconda3\python.exe" -ArgumentList @(
  "-m",
  "uvicorn",
  "app.main:app",
  "--reload"
) -WorkingDirectory $BackendDir

Start-Process -FilePath "C:\Program Files\nodejs\npm.cmd" -ArgumentList @(
  "run",
  "dev"
) -WorkingDirectory $FrontendDir

Write-Host "Started CareerPilot frontend and backend dev servers."
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://127.0.0.1:8000"
