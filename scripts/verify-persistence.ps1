# Run only against this project's LOCAL test instance. Inserts synthetic data.
param([string]$BaseUrl = 'http://localhost:8088')
$ErrorActionPreference = 'Stop'
$config = Invoke-RestMethod -Uri "$BaseUrl/api/config"
if ($config.mode -ne 'local') { throw 'Persistence verification requires local mode.' }
$payload = @{ name='Synthetic Persistence Tester'; email='persistence@example.invalid'; message='Synthetic persistence and backup restore verification only.'; kind='hiring'; phone=''; website=''; startedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()-5000 } | ConvertTo-Json
$saved = Invoke-RestMethod -Uri "$BaseUrl/api/contact" -Method Post -ContentType 'application/json' -Headers @{Origin=$BaseUrl} -Body $payload
$inquiryId = $saved.id
function Assert-SyntheticRecord {
    $row = docker compose exec -T backend node admin.mjs inspect $inquiryId | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0 -or $row.id -ne $inquiryId) { throw 'Synthetic record not found.' }
    $data = $row.payload | ConvertFrom-Json
    if ($data.email -ne 'persistence@example.invalid') { throw 'Unexpected restored payload.' }
}
Assert-SyntheticRecord
docker compose restart backend
if ($LASTEXITCODE -ne 0) { throw 'Restart failed.' }
docker compose up -d --wait backend
Assert-SyntheticRecord
Write-Output 'PASS: synthetic inquiry survived backend restart.'
docker compose up -d --build --force-recreate --wait backend
if ($LASTEXITCODE -ne 0) { throw 'Rebuild/recreation failed.' }
Assert-SyntheticRecord
Write-Output 'PASS: synthetic inquiry survived rebuild and container replacement.'
& "$PSScriptRoot/backup.ps1" -Path backups/synthetic-verification.sqlite
docker compose exec -T backend node admin.mjs delete $inquiryId
$deleted = docker compose exec -T backend node admin.mjs inspect $inquiryId
if (($deleted -join '').Trim() -ne 'null') { throw 'Synthetic deletion failed.' }
& "$PSScriptRoot/restore.ps1" -Path backups/synthetic-verification.sqlite
Assert-SyntheticRecord
Write-Output 'PASS: deleted synthetic inquiry restored from consistent snapshot.'
docker compose exec -T backend node admin.mjs delete $inquiryId
if ($LASTEXITCODE -ne 0) { throw 'Synthetic cleanup failed.' }
Write-Output 'PASS: synthetic verification record deleted after testing.'
