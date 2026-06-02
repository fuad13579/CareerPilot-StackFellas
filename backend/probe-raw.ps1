$h = @{ 'x-careerpilot-user-id' = 'probe-raw' }
$url = "http://127.0.0.1:8000/api/jobs/search?query=python&location=remote"
$r = Invoke-WebRequest -UseBasicParsing -Headers $h -Uri $url
$j = $r.Content | ConvertFrom-Json
Write-Host "raw response keys: $($j.PSObject.Properties.Name -join ', ')"
Write-Host "source: $($j.source)"
Write-Host "error: $($j.error)"
Write-Host "is_live: $($j.is_live)"
Write-Host "jobs[0]:"
$j.jobs[0] | Format-List
Write-Host "unique sources in jobs: $(($j.jobs | ForEach-Object { $_.source } | Sort-Object -Unique) -join ', ')"
