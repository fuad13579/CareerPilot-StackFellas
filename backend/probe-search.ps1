$ErrorActionPreference = 'Continue'

# Wait for the new uvicorn to bind to :8000
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    $listener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if ($listener) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
}
if (-not $ready) { Write-Host "Backend did not come up within 10s"; exit 1 }

$headers = @{ 'x-careerpilot-user-id' = 'test-uid-001' }
$queries = @(
    @{ name='python';   url='http://127.0.0.1:8000/api/jobs/search?query=python&location=remote&limit=10&allow_demo=true' },
    @{ name='react';    url='http://127.0.0.1:8000/api/jobs/search?query=react&location=remote&limit=10&allow_demo=true' },
    @{ name='designer'; url='http://127.0.0.1:8000/api/jobs/search?query=designer&location=remote&limit=10&allow_demo=true' },
    @{ name='qwertyzzz';url='http://127.0.0.1:8000/api/jobs/search?query=qwertyzzz&location=remote&limit=10&allow_demo=true' }
)

foreach ($q in $queries) {
    Write-Host "--- $($q.name) ---"
    try {
        $r = Invoke-RestMethod -Uri $q.url -Headers $headers -TimeoutSec 30
        Write-Host ("jobs={0} total={1} is_live={2} source={3} error={4}" -f $r.jobs.Count, $r.total, $r.is_live, $r.source, $r.error)
        $r.jobs | Select-Object -First 5 role,company,source | Format-Table -AutoSize -Wrap
    } catch {
        Write-Host "ERROR: $_"
    }
    Write-Host ''
}
