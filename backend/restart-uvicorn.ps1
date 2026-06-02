# Restart-uvicorn: kill anything bound to :8000 (including parent reloader),
# then relaunch detached.
$ErrorActionPreference = 'Continue'

$backendDir = $PSScriptRoot

# 1. Find every PID that owns the :8000 listening socket, regardless of process name.
$portPids = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

# 2. Also include the parent of any uvicorn.exe child (the python.exe reloader).
$uvicornChildren = Get-Process -Name uvicorn -ErrorAction SilentlyContinue
$parentPids = @()
foreach ($child in $uvicornChildren) {
    $wmi = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.Id)" -ErrorAction SilentlyContinue
    if ($wmi -and $wmi.ParentProcessId -and $wmi.ParentProcessId -ne 0) {
        $parentPids += $wmi.ParentProcessId
    }
}

# 3. Combine and dedupe.
$allToKill = @()
if ($portPids)         { $allToKill += @($portPids) }
if ($parentPids)        { $allToKill += @($parentPids) }
if ($uvicornChildren)  { $allToKill += @($uvicornChildren.Id) }
$allToKill = $allToKill | Sort-Object -Unique

foreach ($p in $allToKill) {
    $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Killing PID $($proc.Id) ($($proc.ProcessName))"
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}

# 4. Wait for the OS to release the socket.
$busy = $true
for ($i = 0; $i -lt 20; $i++) {
    $still = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if (-not $still) { $busy = $false; break }
    Start-Sleep -Milliseconds 500
}
if ($busy) {
    Write-Host "Port 8000 still busy after 10s -- aborting."
    exit 1
}

# 5. Launch detached, log to backend dir.
Set-Location $backendDir
$out = Join-Path $backendDir 'uvicorn.out.log'
$err = Join-Path $backendDir 'uvicorn.err.log'
'' | Set-Content -Path $out
'' | Set-Content -Path $err

Write-Host "Launching uvicorn detached -> $out / $err"
$proc = Start-Process -FilePath '.\.venv\Scripts\uvicorn.exe' `
    -ArgumentList 'app.main:app','--host','127.0.0.1','--port','8000' `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err `
    -WindowStyle Hidden `
    -PassThru

Write-Host "Started PID $($proc.Id) at $($proc.StartTime)"
