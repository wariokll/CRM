param(
  [Parameter(Mandatory = $true)][string]$Database,
  [Parameter(Mandatory = $true)][string]$User,
  [Parameter(Mandatory = $true)][string]$Password,
  [string]$Host = '127.0.0.1',
  [int]$Port = 3306,
  [string]$BackupDirectory = 'D:\Backups\BazisCrm',
  [int]$RetentionDays = 14,
  [string]$MariaDbBin = 'C:\Program Files\MariaDB 11.7\bin'
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$archive = Join-Path $BackupDirectory "servio_crm_$stamp.sql.gz"
$temporarySql = Join-Path $BackupDirectory "servio_crm_$stamp.sql"
$dump = Join-Path $MariaDbBin 'mariadb-dump.exe'
if (-not (Test-Path -LiteralPath $dump)) { throw "mariadb-dump.exe не найден: $dump" }

& $dump "--host=$Host" "--port=$Port" "--user=$User" "--password=$Password" '--single-transaction' '--routines' '--events' $Database | Set-Content -LiteralPath $temporarySql -Encoding utf8
try {
  $source = [IO.File]::OpenRead($temporarySql)
  $destination = [IO.File]::Create($archive)
  $gzip = New-Object IO.Compression.GZipStream($destination, [IO.Compression.CompressionMode]::Compress)
  try { $source.CopyTo($gzip) } finally { $gzip.Dispose(); $destination.Dispose(); $source.Dispose() }
} finally { Remove-Item -LiteralPath $temporarySql -Force -ErrorAction SilentlyContinue }

Get-ChildItem -LiteralPath $BackupDirectory -Filter 'servio_crm_*.sql.gz' | Where-Object LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) | Remove-Item -Force
Write-Host "Backup created: $archive"
