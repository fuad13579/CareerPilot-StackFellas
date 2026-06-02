$ErrorActionPreference = 'Continue'

# Confirm the upstream behavior of arbeitnow
$headers = @{ 'User-Agent' = 'curl/8.0' }
foreach ($q in @('python', 'react', 'qwertyzzz')) {
    Write-Host "--- arbeitnow search='$q' ---"
    try {
        $r = Invoke-RestMethod -Uri "https://www.arbeitnow.com/api/job-board-api?search=$q" -Headers $headers -TimeoutSec 20
        Write-Host ("jobs={0} slug0={1}" -f $r.data.Count, $r.data[0].slug)
        $r.data | Select-Object -First 5 title,company_name,slug | Format-Table -AutoSize -Wrap
    } catch {
        Write-Host "ERROR: $_"
    }
    Write-Host ''
}
