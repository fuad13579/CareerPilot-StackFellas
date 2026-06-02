$ErrorActionPreference = 'Continue'
$base = 'C:\Users\FUAD\source\repos\CareerPilot-StackFellas\backend'
Write-Host '=== uvicorn.err.log (last 100) ==='
Get-Content (Join-Path $base 'uvicorn.err.log') -Tail 100 -ErrorAction SilentlyContinue
Write-Host ''
Write-Host '=== uvicorn.out.log (last 50) ==='
Get-Content (Join-Path $base 'uvicorn.out.log') -Tail 50 -ErrorAction SilentlyContinue
