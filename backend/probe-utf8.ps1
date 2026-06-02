$ErrorActionPreference = 'Continue'

# Use HttpClient (System.Net) to read raw bytes so we can confirm encoding
Add-Type -AssemblyName System.Net.Http
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(20)
$client.DefaultRequestHeaders.Add('x-careerpilot-user-id', 'test-uid-001')
$client.DefaultRequestHeaders.Add('User-Agent', 'probe-utf8/1.0')

$resp = $client.GetAsync('http://127.0.0.1:8000/api/jobs/search?query=python&location=remote&limit=2&allow_demo=true').Result
$bytes = $resp.Content.ReadAsByteArrayAsync().Result
$utf8  = [System.Text.Encoding]::UTF8.GetString($bytes)

# Show Content-Type and a small JSON slice
Write-Host "Status: $($resp.StatusCode)"
Write-Host "Content-Type: $($resp.Content.Headers.ContentType)"
Write-Host "--- first 600 bytes (decoded as UTF-8) ---"
Write-Host $utf8.Substring(0, [Math]::Min(600, $utf8.Length))
Write-Host "--- end ---"
