param(
  [Parameter(Mandatory = $true)][string]$NssmPath,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$NodePath = (Get-Command 'node.exe' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $NssmPath)) { throw "NSSM не найден: $NssmPath" }
if (-not $NodePath) {
  foreach ($candidate in @((Join-Path $env:ProgramFiles 'nodejs\node.exe'), (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe'))) {
    if (Test-Path -LiteralPath $candidate) { $NodePath = $candidate; break }
  }
}
if (-not $NodePath -or -not (Test-Path -LiteralPath $NodePath)) { throw 'Node.js executable was not found. Pass it with -NodePath.' }
$logs = Join-Path $ProjectRoot 'backend\.logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$archiveSuffix = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($logName in @('api-out.log', 'api-error.log', 'telegram-bot-out.log', 'telegram-bot-error.log')) {
  $logPath = Join-Path $logs $logName
  if (Test-Path -LiteralPath $logPath) {
    Move-Item -LiteralPath $logPath -Destination "$logPath.legacy-$archiveSuffix" -Force
  }
}

& $NssmPath install BazisCrmApi $NodePath 'dist/server.js'
& $NssmPath set BazisCrmApi AppDirectory (Join-Path $ProjectRoot 'backend')
& $NssmPath set BazisCrmApi AppStdout (Join-Path $logs 'api-out.log')
& $NssmPath set BazisCrmApi AppStderr (Join-Path $logs 'api-error.log')
& $NssmPath set BazisCrmApi AppExit Default Restart
& $NssmPath set BazisCrmApi Start SERVICE_AUTO_START

& $NssmPath install BazisCrmTelegramBot $NodePath 'dist/telegram/bot.js'
& $NssmPath set BazisCrmTelegramBot AppDirectory (Join-Path $ProjectRoot 'backend')
& $NssmPath set BazisCrmTelegramBot AppStdout (Join-Path $logs 'telegram-bot-out.log')
& $NssmPath set BazisCrmTelegramBot AppStderr (Join-Path $logs 'telegram-bot-error.log')
& $NssmPath set BazisCrmTelegramBot AppExit Default Restart
& $NssmPath set BazisCrmTelegramBot Start SERVICE_AUTO_START

Start-Service BazisCrmApi
Start-Service BazisCrmTelegramBot
Write-Host 'BazisCrmApi and BazisCrmTelegramBot services are installed and running.' -ForegroundColor Green
