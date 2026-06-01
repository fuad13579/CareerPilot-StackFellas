param()

# Stops the detached uvicorn (8000) and next-dev (3000) processes launched by start-dev.ps1.
# Safe to re-run; silently no-ops if nothing is listening.

function Stop-Listening([int]$Port, [string]$Label) {
  $procIds = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
             Select-Object -ExpandProperty OwningProcess -Unique
  if ($procIds) {
    foreach ($id in $procIds) {
      Write-Host "Stopping $Label on port $Port (PID $id)"
      Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    }
  } else {
    Write-Host "Nothing listening on port $Port ($Label)"
  }
}

Stop-Listening -Port 8000 -Label "uvicorn"
Stop-Listening -Port 3000 -Label "next-dev"

Start-Sleep -Seconds 1

$still8000 = (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -join ','
$still3000 = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -join ','

Write-Host ""
Write-Host "After: port 8000 = $(if ($still8000) { $still8000 } else { '<none>' }), port 3000 = $(if ($still3000) { $still3000 } else { '<none>' })"
