$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend'
$mysqlCommand = Get-Command 'mariadbd.exe' -ErrorAction SilentlyContinue
$mysql = if ($mysqlCommand) { $mysqlCommand.Source } else { 'C:\Program Files\MariaDB 11.7\bin\mariadbd.exe' }
$mysqlConfig = Join-Path $backend '.mysql-data\my.ini'
$pidDir = Join-Path $backend '.pids'
$logDir = Join-Path $backend '.logs'
New-Item -ItemType Directory -Force -Path $pidDir, $logDir | Out-Null

if (-not (Get-NetTCPConnection -State Listen -LocalPort 3307 -ErrorAction SilentlyContinue)) {
  if (-not (Test-Path -LiteralPath $mysql)) { throw 'MariaDB was not found. Install it or add mariadbd.exe to PATH.' }
  if (-not (Test-Path -LiteralPath $mysqlConfig)) { throw 'Database config backend/.mysql-data/my.ini was not found.' }
  Start-Process -FilePath $mysql -ArgumentList "--defaults-file=$mysqlConfig" -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(30)
  while (-not (Get-NetTCPConnection -State Listen -LocalPort 3307 -ErrorAction SilentlyContinue)) {
    if ((Get-Date) -gt $deadline) { throw 'Database did not start. Check backend/.logs/database-error.log.' }
    Start-Sleep -Milliseconds 500
  }
}

if (-not (Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue)) {
  $stdout = Join-Path $logDir 'backend-out.log'
  $stderr = Join-Path $logDir 'backend-error.log'
  $process = Start-Process -FilePath 'node.exe' -ArgumentList 'dist/server.js' -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  Set-Content -LiteralPath (Join-Path $pidDir 'backend.pid') -Value $process.Id -NoNewline
}

$botPid = Join-Path $pidDir 'telegram-bot.pid'
$botTokenConfigured = (Get-Content -LiteralPath (Join-Path $backend '.env') -Raw -ErrorAction SilentlyContinue) -match '(?m)^TELEGRAM_BOT_TOKEN=.+$'
if ($botTokenConfigured) {
  $existingBotPid = if (Test-Path -LiteralPath $botPid) { [int](Get-Content -LiteralPath $botPid) } else { 0 }
  if (-not $existingBotPid -or -not (Get-Process -Id $existingBotPid -ErrorAction SilentlyContinue)) {
    $botOut = Join-Path $logDir 'telegram-bot-out.log'
    $botErr = Join-Path $logDir 'telegram-bot-error.log'
    $botProcess = Start-Process -FilePath 'node.exe' -ArgumentList 'dist/telegram/bot.js' -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput $botOut -RedirectStandardError $botErr -PassThru
    Set-Content -LiteralPath $botPid -Value $botProcess.Id -NoNewline
  }
}

Start-Process 'http://localhost:3001'
Write-Host 'CRM is available at http://localhost:3001' -ForegroundColor Green
