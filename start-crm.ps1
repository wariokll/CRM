$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend'
$mysql = 'C:\Program Files\MariaDB 11.7\bin\mariadbd.exe'
$mysqlConfig = Join-Path $backend '.mysql-data\my.ini'
$pidDir = Join-Path $backend '.pids'
$logDir = Join-Path $backend '.logs'
New-Item -ItemType Directory -Force -Path $pidDir, $logDir | Out-Null

if (-not (Get-NetTCPConnection -State Listen -LocalPort 3307 -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $mysql -ArgumentList "--defaults-file=$mysqlConfig" -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(30)
  while (-not (Get-NetTCPConnection -State Listen -LocalPort 3307 -ErrorAction SilentlyContinue)) {
    if ((Get-Date) -gt $deadline) { throw 'База данных не запустилась. Проверьте backend/.logs/database-error.log' }
    Start-Sleep -Milliseconds 500
  }
}

if (-not (Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue)) {
  $stdout = Join-Path $logDir 'backend-out.log'
  $stderr = Join-Path $logDir 'backend-error.log'
  $process = Start-Process -FilePath 'node.exe' -ArgumentList 'dist/server.js' -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  Set-Content -LiteralPath (Join-Path $pidDir 'backend.pid') -Value $process.Id -NoNewline
}

Start-Process 'http://localhost:3001'
Write-Host 'БАЗИС CRM доступна по адресу http://localhost:3001' -ForegroundColor Green
