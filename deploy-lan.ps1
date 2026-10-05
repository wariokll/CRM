[CmdletBinding()]
param(
  [switch]$SkipFirewall,
  [switch]$SkipSeed,
  [string]$BackupDirectory
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend'
$logDir = Join-Path $backend '.logs'
$pidDir = Join-Path $backend '.pids'
$databaseRoot = Join-Path $backend '.mysql-data'
$dataDir = Join-Path $databaseRoot 'data'
$mysqlConfig = Join-Path $databaseRoot 'my.ini'
$envPath = Join-Path $backend '.env'
$rootPasswordPath = Join-Path $backend '.db-root-password'
$appPort = 3001
$databasePort = 3307
$databaseName = 'servio_crm'
$databaseUser = 'crm_user'
$firewallRuleName = 'Bazis CRM LAN'
$backupDirectory = if ($BackupDirectory) { $BackupDirectory } else { Join-Path $root 'backups' }
if (-not [IO.Path]::IsPathRooted($backupDirectory)) { $backupDirectory = Join-Path $root $backupDirectory }
$backupDirectory = [IO.Path]::GetFullPath($backupDirectory)

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function New-HexSecret([int]$ByteLength) {
  $bytes = New-Object byte[] $ByteLength
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

function Find-Executable([string]$Name, [string[]]$FallbackPaths = @()) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($command -and $command.Source) { return $command.Source }
  foreach ($path in $FallbackPaths) {
    if ($path -and (Test-Path -LiteralPath $path)) { return $path }
  }
  return $null
}

function Refresh-Path {
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $pathEntries = @($machinePath, $userPath) | Where-Object { $_ }
  $env:Path = [string]::Join(';', $pathEntries)
}

function Install-WinGetPackage([string]$Id, [string]$FriendlyName = $Id) {
  $winget = Get-Command 'winget.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $winget) {
    throw "winget is required to install $FriendlyName. Install Microsoft App Installer (winget), then rerun this script."
  }
  Write-Host "Installing $FriendlyName ($Id)..." -ForegroundColor Cyan
  & $winget.Source install --id $Id --exact --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "winget failed to install $Id (exit $LASTEXITCODE)." }
  Refresh-Path
}

function Invoke-Checked([string]$Command, [string[]]$Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed (exit $LASTEXITCODE): $Command $($Arguments -join ' ')"
  }
}

function Invoke-Npm([string]$WorkingDirectory, [string[]]$Arguments) {
  Push-Location $WorkingDirectory
  try { Invoke-Checked $script:npmCommand $Arguments }
  finally { Pop-Location }
}

function Ensure-NpmDependencies([string]$WorkingDirectory) {
  Push-Location $WorkingDirectory
  try {
    & $script:npmCommand ls --depth=0 --silent
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Installing dependencies in $WorkingDirectory..." -ForegroundColor Cyan
      Invoke-Checked $script:npmCommand @('ci', '--no-audit', '--no-fund', '--progress=false')
    } else {
      Write-Host "Dependencies are already installed in $WorkingDirectory."
    }
  } finally {
    Pop-Location
  }
}

function Read-EnvFile([string]$Path) {
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
      $key = $Matches[1]
      $value = $Matches[2].Trim()
      if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[-1] -eq '"') -or ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $values[$key] = $value
    }
  }
  return $values
}

function Stop-ManagedProcess([string]$PidFile, [string]$ExpectedCommand) {
  if (-not (Test-Path -LiteralPath $PidFile)) { return @() }
  $processId = 0
  if (-not [int]::TryParse((Get-Content -LiteralPath $PidFile -Raw).Trim(), [ref]$processId)) {
    throw "Invalid PID file: $PidFile"
  }
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
  if ($process) {
    if ($process.CommandLine -notmatch $ExpectedCommand) {
      throw "PID $processId is not the expected CRM process; refusing to stop it."
    }
    Stop-Process -Id $processId -ErrorAction Stop
    Wait-Process -Id $processId -Timeout 15 -ErrorAction SilentlyContinue
    if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
      throw "CRM process $processId did not stop."
    }
    Write-Host "Stopped managed process $processId."
    Remove-Item -LiteralPath $PidFile -Force
    return @($processId)
  }
  Remove-Item -LiteralPath $PidFile -Force
  return @()
}

if (-not (Test-IsAdministrator)) {
  throw 'Run this script from an elevated PowerShell window. Use -SkipFirewall only if the LAN firewall rule is managed separately.'
}

New-Item -ItemType Directory -Force -Path $logDir, $pidDir, $databaseRoot | Out-Null

$nodeCommand = Find-Executable 'node.exe' @(
  (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
  (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe')
)
if (-not $nodeCommand) {
  Install-WinGetPackage 'OpenJS.NodeJS.LTS'
  $nodeCommand = Find-Executable 'node.exe' @(
    (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe')
  )
}
if (-not $nodeCommand) { throw 'Node.js was not found after installation.' }
$nodeVersion = (& $nodeCommand --version).Trim().TrimStart('v')
if ([version]$nodeVersion -lt [version]'20.0') {
  Install-WinGetPackage 'OpenJS.NodeJS.LTS'
  $nodeCommand = Find-Executable 'node.exe' @((Join-Path $env:ProgramFiles 'nodejs\node.exe'))
  if (-not $nodeCommand -or [version]((& $nodeCommand --version).Trim().TrimStart('v')) -lt [version]'20.0') {
    throw 'Node.js 20 or later is required.'
  }
}
$nodeDirectory = Split-Path -Parent $nodeCommand
$npmCommand = Find-Executable 'npm.cmd' @((Join-Path $nodeDirectory 'npm.cmd'))
if (-not $npmCommand) { throw 'npm.cmd was not found next to Node.js.' }
$env:Path = "$nodeDirectory;$env:Path"

$mariadbFallbacks = @()
foreach ($installRoot in @($env:ProgramFiles, (Join-Path $env:LOCALAPPDATA 'Programs'))) {
  if ($installRoot -and (Test-Path -LiteralPath $installRoot)) {
    $mariadbFallbacks += Get-ChildItem -Path (Join-Path $installRoot 'MariaDB*') -Directory -ErrorAction SilentlyContinue |
      ForEach-Object { Join-Path $_.FullName 'bin\mariadbd.exe' }
  }
}
$mariadbd = Find-Executable 'mariadbd.exe' $mariadbFallbacks
if (-not $mariadbd) {
  Install-WinGetPackage 'MariaDB.Server'
  $mariadbd = Find-Executable 'mariadbd.exe' $mariadbFallbacks
}
if (-not $mariadbd) { throw 'MariaDB Server was not found after installation.' }
$mariaBin = Split-Path -Parent $mariadbd
$mariaClient = Join-Path $mariaBin 'mariadb.exe'
if (-not (Test-Path -LiteralPath $mariaClient)) { $mariaClient = Join-Path $mariaBin 'mysql.exe' }
$mariaInstaller = Join-Path $mariaBin 'mariadb-install-db.exe'
if (-not (Test-Path -LiteralPath $mariaInstaller)) { $mariaInstaller = Join-Path $mariaBin 'mysql_install_db.exe' }
if (-not (Test-Path -LiteralPath $mariaClient)) { throw 'MariaDB command-line client was not found.' }
if (-not (Test-Path -LiteralPath $mariaInstaller)) { throw 'MariaDB database initializer was not found.' }
$env:Path = "$mariaBin;$env:Path"

$caddyCommand = Find-Executable 'caddy.exe' @(
  (Join-Path $env:ProgramFiles 'Caddy\caddy.exe'),
  (Join-Path $env:ProgramFiles 'Caddy\caddy.exe'),
  (Join-Path $env:LOCALAPPDATA 'Programs\Caddy\caddy.exe'),
  'C:\Tools\Caddy\caddy.exe'
)
if (-not $caddyCommand) {
  try {
    Install-WinGetPackage 'Caddy.Caddy' 'Caddy'
  } catch {
    throw "Caddy was not found and cannot be installed automatically. Install Microsoft App Installer (winget) or download Caddy manually to C:\Program Files\Caddy\caddy.exe or C:\Tools\Caddy\caddy.exe, then rerun this script."
  }
  $caddyCommand = Find-Executable 'caddy.exe' @(
    (Join-Path $env:ProgramFiles 'Caddy\caddy.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Caddy\caddy.exe'),
    'C:\Tools\Caddy\caddy.exe'
  )
}
if (-not $caddyCommand) { throw 'Caddy was not found after installation.' }
$caddyDirectory = Split-Path -Parent $caddyCommand
$env:Path = "$caddyDirectory;$env:Path"

$nssmCommand = Find-Executable 'nssm.exe' @(
  (Join-Path $env:ProgramFiles 'NSSM\win64\nssm.exe'),
  (Join-Path $env:LOCALAPPDATA 'nssm\win64\nssm.exe'),
  'C:\Tools\nssm\win64\nssm.exe',
  'C:\Program Files\NSSM\win64\nssm.exe'
)
if (-not $nssmCommand) {
  try {
    Install-WinGetPackage 'NSSM.NSSM' 'NSSM'
  } catch {
    throw "NSSM was not found and cannot be installed automatically. Install Microsoft App Installer (winget) or download NSSM manually to C:\Program Files\NSSM\win64\nssm.exe or C:\Tools\nssm\win64\nssm.exe, then rerun this script."
  }
  $nssmCommand = Find-Executable 'nssm.exe' @(
    (Join-Path $env:ProgramFiles 'NSSM\win64\nssm.exe'),
    (Join-Path $env:LOCALAPPDATA 'nssm\win64\nssm.exe'),
    'C:\Tools\nssm\win64\nssm.exe',
    'C:\Program Files\NSSM\win64\nssm.exe'
  )
}
if (-not $nssmCommand) { throw 'NSSM was not found after installation.' }
$nssmDirectory = Split-Path -Parent $nssmCommand
$env:Path = "$nssmDirectory;$env:Path"

$initialAdminPassword = $null
$initialDemoPassword = $null
if (-not (Test-Path -LiteralPath $envPath)) {
  $databasePassword = New-HexSecret 32
  $initialAdminPassword = New-HexSecret 20
  $initialDemoPassword = New-HexSecret 20
  $envLines = @(
    'PORT=3001',
    "DATABASE_URL=`"mysql://$databaseUser`:$databasePassword@127.0.0.1`:$databasePort/$databaseName`"",
    "JWT_ACCESS_SECRET=`"$(New-HexSecret 48)`"",
    "JWT_REFRESH_SECRET=`"$(New-HexSecret 48)`"",
    "ENCRYPTION_KEY=`"$(New-HexSecret 32)`"",
    'CLIENT_ORIGIN="http://localhost:3001"',
    'NODE_ENV="development"',
    'COOKIE_SECURE="false"',
    'ADMIN_EMAIL="admin@bazis.ru"',
    "ADMIN_PASSWORD=`"$initialAdminPassword`"",
    'DEMO_USER_EMAIL="user@bazis.ru"',
    "DEMO_USER_PASSWORD=`"$initialDemoPassword`""
  )
  [IO.File]::WriteAllLines($envPath, $envLines, (New-Object System.Text.UTF8Encoding($false)))
}

$envValues = Read-EnvFile $envPath
if (-not $envValues.DATABASE_URL) { throw 'backend/.env must define DATABASE_URL.' }
if (-not $envValues.PORT) { throw 'backend/.env must define PORT=3001.' }
if ([int]$envValues.PORT -ne $appPort) { throw 'This LAN launcher expects PORT=3001.' }
$databaseUri = [Uri]$envValues.DATABASE_URL
if ($databaseUri.Scheme -ne 'mysql' -or $databaseUri.Host -notin @('127.0.0.1', 'localhost') -or $databaseUri.Port -ne $databasePort) {
  throw 'DATABASE_URL must use the local MariaDB instance at 127.0.0.1:3307.'
}
$databaseAuth = $databaseUri.UserInfo -split ':', 2
if ($databaseAuth.Count -ne 2) { throw 'DATABASE_URL must include a database username and password.' }
$databaseUser = [Uri]::UnescapeDataString($databaseAuth[0])
$databasePassword = [Uri]::UnescapeDataString($databaseAuth[1])
$databaseName = [Uri]::UnescapeDataString($databaseUri.AbsolutePath.Trim('/'))
if ($databaseUser -notmatch '^[A-Za-z0-9_]+$' -or $databaseName -notmatch '^[A-Za-z0-9_]+$') {
  throw 'DATABASE_URL contains an unsupported database name or username.'
}

$rootPassword = $null
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'mysql'))) {
  $existingData = @(Get-ChildItem -LiteralPath $dataDir -Force -ErrorAction SilentlyContinue)
  if ($existingData.Count -gt 0) { throw 'MariaDB data directory is partially initialized; inspect backend/.mysql-data before retrying.' }
  $rootPassword = New-HexSecret 32
  Invoke-Checked $mariaInstaller @("--datadir=$dataDir", "--password=$rootPassword", "--port=$databasePort", '--silent')
  [IO.File]::WriteAllText($rootPasswordPath, $rootPassword, (New-Object System.Text.UTF8Encoding($false)))
} else {
  if (-not (Test-Path -LiteralPath $rootPasswordPath)) { throw 'backend/.db-root-password is missing for the initialized local database.' }
  $rootPassword = (Get-Content -LiteralPath $rootPasswordPath -Raw).Trim()
}

$dataDirForIni = $dataDir.Replace('\', '/')
$logDirForIni = $logDir.Replace('\', '/')
$iniLines = @(
  '[mysqld]',
  "datadir=$dataDirForIni",
  "port=$databasePort",
  'bind-address=127.0.0.1',
  'character-set-server=utf8mb4',
  'collation-server=utf8mb4_unicode_ci',
  'skip-name-resolve',
  "log-error=$logDirForIni/database-error.log"
)
[IO.File]::WriteAllLines($mysqlConfig, $iniLines, [Text.Encoding]::Default)

$databaseServiceName = 'BazisCrmDatabase'
$databaseService = Get-Service -Name $databaseServiceName -ErrorAction SilentlyContinue
if (-not $databaseService) {
  Invoke-Checked $nssmCommand @('install', $databaseServiceName, $mariadbd, "--defaults-file=`"$mysqlConfig`"")
}
Invoke-Checked $nssmCommand @('set', $databaseServiceName, 'Application', $mariadbd)
Invoke-Checked $nssmCommand @('set', $databaseServiceName, 'AppParameters', "--defaults-file=`"$mysqlConfig`"")
Invoke-Checked $nssmCommand @('set', $databaseServiceName, 'AppDirectory', $mariaBin)
Invoke-Checked $nssmCommand @('set', $databaseServiceName, 'AppExit', 'Default', 'Restart')
Invoke-Checked $nssmCommand @('set', $databaseServiceName, 'Start', 'SERVICE_AUTO_START')

$databaseListeners = @(Get-NetTCPConnection -State Listen -LocalPort $databasePort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
if ($databaseListeners.Count -gt 0 -and (-not $databaseService -or $databaseService.Status -ne 'Running')) {
  if ($databaseListeners.Count -ne 1) { throw "Multiple processes are listening on database port $databasePort; refusing to stop them." }
  $existingDatabaseProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($databaseListeners[0])" -ErrorAction SilentlyContinue
  if (-not $existingDatabaseProcess -or $existingDatabaseProcess.ExecutablePath -ine $mariadbd -or $existingDatabaseProcess.CommandLine -notlike "*--defaults-file=$mysqlConfig*") {
    throw "Database port $databasePort is used by an unmanaged process; refusing to stop it."
  }
  $mariaAdmin = Join-Path $mariaBin 'mariadb-admin.exe'
  if (-not (Test-Path -LiteralPath $mariaAdmin)) { $mariaAdmin = Join-Path $mariaBin 'mysqladmin.exe' }
  if (-not (Test-Path -LiteralPath $mariaAdmin)) { throw 'MariaDB admin client was not found to safely switch to service mode.' }
  $env:MYSQL_PWD = $rootPassword
  try {
    Invoke-Checked $mariaAdmin @('--protocol=tcp', '--host=127.0.0.1', "--port=$databasePort", '--user=root', 'shutdown')
  } finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
  }
  $shutdownDeadline = (Get-Date).AddSeconds(30)
  while (Get-NetTCPConnection -State Listen -LocalPort $databasePort -ErrorAction SilentlyContinue) {
    if ((Get-Date) -gt $shutdownDeadline) { throw 'Standalone MariaDB did not stop before the service transition.' }
    Start-Sleep -Milliseconds 500
  }
}

if (-not (Get-NetTCPConnection -State Listen -LocalPort $databasePort -ErrorAction SilentlyContinue)) {
  if (-not $databaseService -or $databaseService.Status -ne 'Running') {
    Start-Service -Name $databaseServiceName -ErrorAction Stop
  }
  $deadline = (Get-Date).AddSeconds(60)
  while (-not (Get-NetTCPConnection -State Listen -LocalPort $databasePort -ErrorAction SilentlyContinue)) {
    $databaseService = Get-Service -Name $databaseServiceName
    if ((Get-Date) -gt $deadline -or $databaseService.Status -eq 'Stopped') {
      throw 'MariaDB did not start. Check backend/.logs/database-error.log.'
    }
    Start-Sleep -Milliseconds 500
  }
}

$databasePasswordSql = $databasePassword.Replace("'", "''")
$rootSql = @"
CREATE DATABASE IF NOT EXISTS $databaseName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$databaseUser'@'127.0.0.1' IDENTIFIED BY '$databasePasswordSql';
ALTER USER '$databaseUser'@'127.0.0.1' IDENTIFIED BY '$databasePasswordSql';
CREATE USER IF NOT EXISTS '$databaseUser'@'localhost' IDENTIFIED BY '$databasePasswordSql';
ALTER USER '$databaseUser'@'localhost' IDENTIFIED BY '$databasePasswordSql';
GRANT ALL PRIVILEGES ON $databaseName.* TO '$databaseUser'@'127.0.0.1';
GRANT ALL PRIVILEGES ON $databaseName.* TO '$databaseUser'@'localhost';
FLUSH PRIVILEGES;
"@
$env:MYSQL_PWD = $rootPassword
try {
  $rootSql | & $mariaClient --protocol=tcp --host=127.0.0.1 --port=$databasePort --user=root --batch
  if ($LASTEXITCODE -ne 0) { throw "Could not configure local database user (exit $LASTEXITCODE)." }
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

foreach ($serviceName in @('BazisCrmApi', 'BazisCrmTelegramBot')) {
  $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
  if ($service -and $service.Status -ne 'Stopped') {
    Stop-Service -Name $serviceName -Force -ErrorAction Stop
  }
}

$stoppedPids = @()
$stoppedPids += Stop-ManagedProcess (Join-Path $pidDir 'telegram-bot.pid') 'dist/telegram/bot\.js'
$stoppedPids += Stop-ManagedProcess (Join-Path $pidDir 'backend.pid') 'dist/server\.js'
$portOwners = @(Get-NetTCPConnection -State Listen -LocalPort $appPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
if ($portOwners | Where-Object { $_ -notin $stoppedPids }) {
  throw "Port $appPort is already used by an unmanaged process; refusing to terminate it."
}

Write-Host 'Installing locked frontend and backend dependencies...' -ForegroundColor Cyan
Ensure-NpmDependencies $root
Ensure-NpmDependencies $backend
Invoke-Npm $backend @('run', 'prisma:generate')
Invoke-Npm $backend @('run', 'prisma:deploy')

$runtimeDir = Join-Path $backend '.runtime-tmp'
$countScriptPath = Join-Path $runtimeDir 'seed-status.mjs'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$countScript = @'
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  console.log(await prisma.user.count());
} finally {
  await prisma.$disconnect();
}
'@
[IO.File]::WriteAllText($countScriptPath, $countScript, (New-Object System.Text.UTF8Encoding($false)))
Push-Location $backend
try {
  $userCountResult = & $nodeCommand $countScriptPath
  if ($LASTEXITCODE -ne 0) { throw 'Could not check whether the CRM database has been seeded.' }
} finally {
  Pop-Location
  Remove-Item -LiteralPath $countScriptPath -Force -ErrorAction SilentlyContinue
}
$userCount = [int](($userCountResult | Select-Object -Last 1).ToString().Trim())
if ($userCount -eq 0 -and -not $SkipSeed) {
  Invoke-Npm $backend @('run', 'seed')
} elseif ($userCount -eq 0) {
  Write-Warning 'Database is empty because -SkipSeed was specified.'
} else {
  Write-Host 'Existing users found; seed skipped to preserve account passwords.'
}

Invoke-Npm $backend @('run', 'build')
Invoke-Npm $root @('run', 'build')

if (-not $SkipFirewall) {
  $existingRule = Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue
  if ($existingRule) {
    $existingRule | Remove-NetFirewallRule
  }
  New-NetFirewallRule -DisplayName $firewallRuleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $appPort -Profile Domain,Private -RemoteAddress LocalSubnet | Out-Null
}

$nssmInstaller = Join-Path $root 'deploy\windows\install-nssm-services.ps1'
if (Test-Path -LiteralPath $nssmInstaller) {
  foreach ($serviceName in @('BazisCrmApi', 'BazisCrmTelegramBot')) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
      Stop-Service -Name $serviceName -ErrorAction SilentlyContinue
      & $nssmCommand remove $serviceName confirm | Out-Null
    }
  }
  & $nssmInstaller -NssmPath $nssmCommand -ProjectRoot $root -NodePath $nodeCommand
  Invoke-Checked $nssmCommand @('set', 'BazisCrmApi', 'DependOnService', $databaseServiceName)
  Invoke-Checked $nssmCommand @('set', 'BazisCrmTelegramBot', 'DependOnService', $databaseServiceName)
}

$health = $null
$healthDeadline = (Get-Date).AddSeconds(30)
while (-not $health -and (Get-Date) -lt $healthDeadline) {
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$appPort/api/health" -TimeoutSec 2
  } catch {
    Start-Sleep -Milliseconds 500
  }
}
if (-not $health -or -not $health.database) { throw 'CRM health check failed. Inspect backend/.logs.' }

$defaultRoute = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
  Sort-Object RouteMetric |
  Select-Object -First 1
$lanAddresses = @()
if ($defaultRoute) {
  $lanAddresses = @(Get-NetIPAddress -InterfaceIndex $defaultRoute.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -ExpandProperty IPAddress -Unique)
}
if ($lanAddresses.Count -eq 0) {
  $lanAddresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'Loopback' } |
    Select-Object -ExpandProperty IPAddress -Unique)
}
if ($lanAddresses.Count -eq 0) { throw 'No LAN IPv4 address was found.' }
$backupScript = Join-Path $root 'deploy\windows\backup-mariadb.ps1'
$backupTaskName = 'BazisCrmDatabaseBackup'
$backupPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$backupArguments = "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -ProjectRoot `"$root`" -BackupDirectory `"$backupDirectory`" -MariaDbBin `"$mariaBin`""
$backupAction = New-ScheduledTaskAction -Execute $backupPowerShell -Argument $backupArguments
$backupTrigger = New-ScheduledTaskTrigger -Daily -At '2:15AM'
$backupPrincipal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$backupSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $backupTaskName -Action $backupAction -Trigger $backupTrigger -Principal $backupPrincipal -Settings $backupSettings -Description 'Daily compressed MariaDB backup for Bazis CRM.' -Force | Out-Null
Write-Host "Registered daily database backup task '$backupTaskName' at 02:15. Backups: $backupDirectory" -ForegroundColor Green
& $backupScript -ProjectRoot $root -BackupDirectory $backupDirectory -MariaDbBin $mariaBin

$profiles = @(Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.NetworkCategory -in @('Private', 'DomainAuthenticated') })
if (-not $SkipFirewall -and $profiles.Count -eq 0) {
  Write-Warning 'No active Private/Domain network profile was found. Set the LAN profile to Private for the firewall rule to apply.'
}
Write-Host 'CRM is ready for devices on the local network:' -ForegroundColor Green
foreach ($address in $lanAddresses) { Write-Host "  http://${address}:$appPort" -ForegroundColor Green }
if ($initialAdminPassword) {
  Write-Host 'Initial administrator: admin@bazis.ru' -ForegroundColor Yellow
  Write-Host "Initial administrator password: $initialAdminPassword" -ForegroundColor Yellow
  Write-Host 'Change this password after the first login.' -ForegroundColor Yellow
} elseif ($userCount -eq 0) {
  Write-Host 'Initial credentials were read from backend/.env; keep that file private.' -ForegroundColor Yellow
}
if ($SkipFirewall) { Write-Warning 'Firewall was not changed; allow inbound TCP 3001 from the local subnet separately.' }