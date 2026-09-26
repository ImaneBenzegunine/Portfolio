param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = "Stop"
$backupSource = (Resolve-Path -LiteralPath $Path).Path
$encodedBackup = [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes($backupSource))
docker compose stop backend
if ($LASTEXITCODE -ne 0) { throw "Could not stop backend." }
$encodedBackup | docker compose run --rm -T --no-deps backend node admin.mjs restore
if ($LASTEXITCODE -ne 0) { throw "Restore failed; backend left stopped for inspection." }
docker compose up -d --wait backend
if ($LASTEXITCODE -ne 0) { throw "Backend did not become healthy." }
# A recreated backend may have a new internal IP; reload the proxy safely.
docker compose exec -T frontend nginx -s reload
