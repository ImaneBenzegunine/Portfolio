param([string]$Path = "backups/contact-backup.sqlite")
$ErrorActionPreference = "Stop"
$backupTarget = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Path))
$backupParent = [System.IO.Path]::GetDirectoryName($backupTarget)
New-Item -ItemType Directory -Force -Path $backupParent | Out-Null
$encodedBackup = docker compose exec -T backend node admin.mjs backup
if ($LASTEXITCODE -ne 0) { throw "Backup command failed." }
[System.IO.File]::WriteAllBytes($backupTarget, [System.Convert]::FromBase64String(($encodedBackup -join "")))
Write-Output "Snapshot written to $backupTarget. Treat it as private data."
