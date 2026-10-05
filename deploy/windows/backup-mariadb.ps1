param(
  [string]$Database,
  [string]$User,
  [string]$Password,
  [string]$DbHost,
  [int]$Port = 0,
  [string]$BackupDirectory = 'D:\Backups\BazisCrm',
  [int]$RetentionDays = 14,
  [string]$MariaDbBin,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)
$ErrorActionPreference = 'Stop'
$envPath = Join-Path $ProjectRoot 'backend\.env'
if (-not (Test-Path -LiteralPath $envPath)) { throw "Environment file not found: $envPath" }
$environment = @{}
foreach ($line in Get-Content -LiteralPath $envPath) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
    $value = $Matches[2]
    if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[-1] -eq '"') -or ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $environment[$Matches[1]] = $value
  }
}
if (-not $environment.DATABASE_URL) { throw 'backend/.env must define DATABASE_URL.' }
$databaseUri = [Uri]$environment.DATABASE_URL
$databaseAuth = $databaseUri.UserInfo -split ':', 2
if ($databaseAuth.Count -ne 2) { throw 'DATABASE_URL must include a database username and password.' }
if (-not $Database) { $Database = [Uri]::UnescapeDataString($databaseUri.AbsolutePath.Trim('/')) }
if (-not $User) { $User = [Uri]::UnescapeDataString($databaseAuth[0]) }
if (-not $Password) { $Password = [Uri]::UnescapeDataString($databaseAuth[1]) }
if (-not $DbHost) { $DbHost = $databaseUri.Host }
if (-not $Port) { $Port = $databaseUri.Port }
if (-not $MariaDbBin) {
  $mariaDumpCommand = Get-Command 'mariadb-dump.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($mariaDumpCommand) { $MariaDbBin = Split-Path -Parent $mariaDumpCommand.Source }
}
if (-not $MariaDbBin) {
  $mariaCandidates = @(
    (Join-Path $env:ProgramFiles 'MariaDB 11.7\bin'),
    (Join-Path $env:ProgramFiles 'MariaDB 11.8\bin'),
    (Join-Path $env:LOCALAPPDATA 'Programs\MariaDB-11.8\bin')
  )
  $MariaDbBin = $mariaCandidates | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'mariadb-dump.exe') } | Select-Object -First 1
}
if (-not $MariaDbBin) { throw 'MariaDB client directory was not found. Pass it with -MariaDbBin.' }
New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$archive = Join-Path $BackupDirectory "servio_crm_$stamp.sql.gz"
$temporarySql = Join-Path $BackupDirectory "servio_crm_$stamp.sql"
$dump = Join-Path $MariaDbBin 'mariadb-dump.exe'
if (-not (Test-Path -LiteralPath $dump)) { throw "mariadb-dump.exe не найден: $dump" }

try {
  $env:MYSQL_PWD = $Password
  & $dump "--host=$DbHost" "--port=$Port" "--user=$User" '--single-transaction' '--routines' '--events' $Database | Set-Content -LiteralPath $temporarySql -Encoding utf8
  $dumpExitCode = $LASTEXITCODE
  if ($dumpExitCode -ne 0) { throw "mariadb-dump failed with exit code $dumpExitCode." }
  $source = [IO.File]::OpenRead($temporarySql)
  $destination = [IO.File]::Create($archive)
  $gzip = New-Object IO.Compression.GZipStream($destination, [IO.Compression.CompressionMode]::Compress)
  try { $source.CopyTo($gzip) } finally { $gzip.Dispose(); $destination.Dispose(); $source.Dispose() }
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $temporarySql -Force -ErrorAction SilentlyContinue
}

Get-ChildItem -LiteralPath $BackupDirectory -Filter 'servio_crm_*.sql.gz' | Where-Object LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) | Remove-Item -Force
Write-Host "Backup created: $archive"
