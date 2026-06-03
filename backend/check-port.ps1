Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object OwningProcess, @{n='Proc';e={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}}, @{n='Path';e={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Path}} |
    Format-Table -AutoSize

Write-Host '--- All processes whose path mentions this backend folder ---'
Get-Process | Where-Object { $_.Path -and $_.Path -like "*$PSScriptRoot*" } |
    Select-Object Id, ProcessName, Path, StartTime |
    Format-Table -AutoSize

Write-Host '--- All uvicorn.exe processes anywhere on the system ---'
Get-Process -Name uvicorn -ErrorAction SilentlyContinue |
    Select-Object Id, ProcessName, Path, StartTime |
    Format-Table -AutoSize
