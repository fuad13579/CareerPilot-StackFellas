$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$envExample = Join-Path $base '.env.example'
$envFile    = Join-Path $base '.env'

# 1. Make sure backend/.env exists; create from .env.example if not.
if (-not (Test-Path $envFile)) {
    Write-Host "Creating backend\.env from .env.example..."
    Copy-Item $envExample $envFile
} else {
    Write-Host "backend\.env already exists -- leaving existing values intact."
}

# 2. Read current .env content.
$content = Get-Content $envFile -Raw

# 3. Replace the commented Adzuna block with uncommented placeholders.
#    Match the literal block from .env.example (4 commented lines).
$pattern = "(?ms)# --- Job Search APIs -+.*?# ADZUNA_COUNTRY=us.*?\r?\n"
$replacement = @"
# --- Job Search APIs -------------------------------------------------------
# Remotive is enabled by default (no key required).
# Arbeitnow is also keyless.
# Uncomment and paste the Adzuna values below to enable real free-text
# search. Get free keys (250 calls/month) at: https://developer.adzuna.com/
# --------------------------------------------------------------------------
ADZUNA_APP_ID=__PASTE_APP_ID_HERE__
ADZUNA_APP_KEY=__PASTE_APP_KEY_HERE__
ADZUNA_COUNTRY=us
"@ + "`r`n"

if ($content -match $pattern) {
    $newContent = [regex]::Replace($content, $pattern, $replacement, 1)
    Set-Content -Path $envFile -Value $newContent -NoNewline
    Write-Host "Uncommented the Adzuna block in backend\.env and added __PASTE_*_HERE__ placeholders."
} else {
    Write-Host "Adzuna block pattern not found in .env -- appending it instead."
    Add-Content -Path $envFile -Value "`r`n$replacement"
}

# 4. Show the relevant lines so the user can see the placeholders.
Write-Host ""
Write-Host "=== Adzuna block in backend\.env (lines containing ADZUNA) ==="
Select-String -Path $envFile -Pattern 'ADZUNA' | ForEach-Object {
    Write-Host ("  line {0}: {1}" -f $_.LineNumber, $_.Line)
}

# 5. Make sure the backend is running with the new fan-out code.
Write-Host ""
Write-Host "=== Backend process check ==="
$listener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    $pids = $listener.OwningProcess | Sort-Object -Unique
    foreach ($p in $pids) {
        $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
        if ($proc) { Write-Host "  uvicorn listening on :8000 -- PID $($proc.Id) started $($proc.StartTime)" }
    }
} else {
    Write-Host "  No uvicorn running on :8000 -- starting now..."
    powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $base 'restart-uvicorn.ps1')
}

Write-Host ""
Write-Host "READY. Next steps for you:"
Write-Host "  1. Open backend\.env in any editor."
Write-Host "  2. Replace __PASTE_APP_ID_HERE__ with the value Adzuna shows as 'app_id'."
Write-Host "  3. Replace __PASTE_APP_KEY_HERE__ with the value Adzuna shows as 'app_key'."
Write-Host "  4. Save, then run:  powershell -NoProfile -ExecutionPolicy Bypass -File .\backend\restart-uvicorn.ps1"
Write-Host "  5. Probe:           powershell -NoProfile -ExecutionPolicy Bypass -File .\backend\probe-search.ps1"
