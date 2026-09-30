$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend'
$mysqlAdmin = 'C:\Program Files\MariaDB 11.7\bin\mariadb-admin.exe'
$databaseRootPassword = Get-Content -LiteralPath (Join-Path $backend '.db-root-password') -Raw
& $mysqlAdmin --protocol=tcp -h 127.0.0.1 -P 3307 -uroot "--password=$($databaseRootPassword.Trim())" shutdown 2>$null
$pidFile = Join-Path $backend '.pids\backend.pid'
$botPidFile = Join-Path $backend '.pids\telegram-bot.pid'
if (Test-Path -LiteralPath $botPidFile) {
  $botProcessId = [int](Get-Content -LiteralPath $botPidFile)
  Stop-Process -Id $botProcessId -ErrorAction SilentlyContinue
}
if (Test-Path -LiteralPath $pidFile) {
  $processId = [int](Get-Content -LiteralPath $pidFile)
  Stop-Process -Id $processId -ErrorAction SilentlyContinue
}
Write-Host 'БАЗИС CRM остановлена.'
