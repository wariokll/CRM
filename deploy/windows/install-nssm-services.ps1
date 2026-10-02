param(
  [Parameter(Mandatory = $true)][string]$NssmPath,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $NssmPath)) { throw "NSSM не найден: $NssmPath" }
$logs = Join-Path $ProjectRoot 'backend\.logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$powershell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

& $NssmPath install BazisCrmApi $powershell "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\run-api.ps1`" -ProjectRoot `"$ProjectRoot`""
& $NssmPath set BazisCrmApi AppDirectory $ProjectRoot
& $NssmPath set BazisCrmApi AppStdout (Join-Path $logs 'api-out.log')
& $NssmPath set BazisCrmApi AppStderr (Join-Path $logs 'api-error.log')
& $NssmPath set BazisCrmApi AppExit Default Restart
& $NssmPath set BazisCrmApi Start SERVICE_AUTO_START

& $NssmPath install BazisCrmTelegramBot $powershell "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\run-telegram-bot.ps1`" -ProjectRoot `"$ProjectRoot`""
& $NssmPath set BazisCrmTelegramBot AppDirectory $ProjectRoot
& $NssmPath set BazisCrmTelegramBot AppStdout (Join-Path $logs 'telegram-bot-out.log')
& $NssmPath set BazisCrmTelegramBot AppStderr (Join-Path $logs 'telegram-bot-error.log')
& $NssmPath set BazisCrmTelegramBot AppExit Default Restart
& $NssmPath set BazisCrmTelegramBot Start SERVICE_AUTO_START

Start-Service BazisCrmApi
Start-Service BazisCrmTelegramBot
Write-Host 'Службы BazisCrmApi и BazisCrmTelegramBot установлены и запущены.' -ForegroundColor Green
