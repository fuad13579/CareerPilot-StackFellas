$h = @{ 'x-careerpilot-user-id' = 'probe-multi' }
$queries = @('python', 'react', 'designer', 'qwertyzzz', 'data scientist')
foreach ($q in $queries) {
    $url = "http://127.0.0.1:8000/api/jobs/search?query=$q&location=remote"
    $r = Invoke-WebRequest -UseBasicParsing -Headers $h -Uri $url
    $j = $r.Content | ConvertFrom-Json
    Write-Host "--- $q ---"
    Write-Host "jobs=$($j.jobs.Count) total=$($j.total) source=$($j.source)"
    Write-Host "per-source counts:"
    $j.jobs | Group-Object source | ForEach-Object { Write-Host "  $($_.Name) = $($_.Count)" }
    Write-Host "top 3 roles:"
    $j.jobs | Select-Object -First 3 role, company, source | ForEach-Object { Write-Host "  [$($_.source)] $($_.role) @ $($_.company)" }
    Write-Host ""
}
