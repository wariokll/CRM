$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$backend = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $backend '.mysql-test-data'
$dataDir = Join-Path $dataRoot 'data'
$logDir = Join-Path $backend '.logs'
$envPath = Join-Path $backend '.env.test'
$rootPasswordPath = Join-Path $backend '.db-test-root-password'
$mariadbRoot = Join-Path $env:LOCALAPPDATA 'Programs\mariadb-11.7.2-winx64'
$mariaBinCommand = Get-Command 'mariadbd.exe' -ErrorAction SilentlyContinue
$mariaBin = if ($mariaBinCommand) { Split-Path -Parent $mariaBinCommand.Source } else { Join-Path $mariadbRoot 'bin' }
$mariadbd = Join-Path $mariaBin 'mariadbd.exe'
$installer = Join-Path $mariaBin 'mariadb-install-db.exe'
$client = Join-Path $mariaBin 'mariadb.exe'
$port = 3308

if (-not (Test-Path -LiteralPath $mariadbd) -or -not (Test-Path -LiteralPath $installer)) {
  throw 'MariaDB 11.7 was not found. Install it or add mariadbd.exe to PATH.'
}
if ((Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) -and
    -not (Test-Path -LiteralPath $envPath)) {
  throw "Test database port $port is already in use and no local test credentials exist."
}
function New-HexSecret([int]$ByteLength) {
  $bytes = New-Object byte[] $ByteLength
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

New-Item -ItemType Directory -Force -Path $dataRoot, $dataDir, $logDir | Out-Null
$envValues = @{}
if (Test-Path -LiteralPath $envPath) {
  foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
      $envValues[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }
  $databasePassword = $envValues.TEST_MARIADB_PASSWORD
  $rootPassword = if (Test-Path -LiteralPath $rootPasswordPath) {
    (Get-Content -LiteralPath $rootPasswordPath -Raw).Trim()
  } else {
    $envValues.TEST_MARIADB_ROOT_PASSWORD
  }
  if (-not $databasePassword -or $databasePassword -match '^replace-') {
    throw 'backend/.env.test does not contain generated test database credentials. Run the setup only once or restore its ignored local file.'
  }
  if (-not $rootPassword -or $rootPassword -match '^replace-') {
    throw 'The test MariaDB root password file is missing; inspect backend/.mysql-test-data before recreating credentials.'
  }
  $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
  if ($listeners.Count -gt 0) {
    if ($listeners.Count -ne 1) { throw "Multiple processes are listening on test database port $port." }
    $databaseProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($listeners[0])" -ErrorAction SilentlyContinue
    $expectedConfig = Join-Path $dataRoot 'my.ini'
    if (-not $databaseProcess -or
        $databaseProcess.ExecutablePath -ine $mariadbd -or
        $databaseProcess.CommandLine -notlike "*--defaults-file=$expectedConfig*") {
      throw "Test database port $port is occupied by an instance that does not match backend/.env.test."
    }
    Write-Host 'Isolated MariaDB 11.7 test instance is already running on 127.0.0.1:3308.' -ForegroundColor Green
    return
  }
} else {
  if (Test-Path -LiteralPath (Join-Path $dataDir 'mysql')) {
    throw 'The test MariaDB data directory exists without backend/.env.test. Inspect backend/.mysql-test-data before continuing.'
  }
  $rootPassword = New-HexSecret 32
  $databasePassword = New-HexSecret 32
  $envLines = @(
    "PORT=3002",
    "DATABASE_URL=`"mysql://crm_test:$databasePassword@127.0.0.1:$port/servio_crm_test`"",
    "JWT_ACCESS_SECRET=`"$(New-HexSecret 48)`"",
    "JWT_REFRESH_SECRET=`"$(New-HexSecret 48)`"",
    "ENCRYPTION_KEY=`"$(New-HexSecret 32)`"",
    'CLIENT_ORIGIN="http://localhost:5173"',
    'NODE_ENV="test"',
    'COOKIE_SECURE="false"',
    "TEST_MARIADB_PASSWORD=$databasePassword",
    "TEST_MARIADB_ROOT_PASSWORD=$rootPassword"
  )
  [IO.File]::WriteAllLines($envPath, $envLines, (New-Object System.Text.UTF8Encoding($false)))
  [IO.File]::WriteAllText($rootPasswordPath, $rootPassword, (New-Object System.Text.UTF8Encoding($false)))
  $installerArgs = @("--datadir=$dataDir", "--password=$rootPassword", "--port=$port", '--silent')
  & $installer @installerArgs | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "MariaDB test data initialization failed (exit $LASTEXITCODE)." }
}

$slash = [char]47
$backslash = [char]92
$iniPath = Join-Path $dataRoot 'my.ini'
$iniLines = @(
  '[mysqld]',
  ('datadir=' + $dataDir.Replace($backslash, $slash)),
  "port=$port",
  'bind-address=127.0.0.1',
  'character-set-server=utf8mb4',
  'collation-server=utf8mb4_unicode_ci',
  'skip-name-resolve',
  ('log-error=' + (Join-Path $logDir 'database-test-error.log').Replace($backslash, $slash))
)
[IO.File]::WriteAllLines($iniPath, $iniLines, [Text.Encoding]::Default)
Start-Process -FilePath $mariadbd -ArgumentList "--defaults-file=$iniPath" -WorkingDirectory $mariaBin -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds(60)
while (-not (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) {
  if ((Get-Date) -gt $deadline) { throw 'MariaDB test database failed to start; inspect backend/.logs/database-test-error.log.' }
  Start-Sleep -Milliseconds 500
}

$env:MYSQL_PWD = $rootPassword
try {
  $sql = @"
CREATE DATABASE IF NOT EXISTS servio_crm_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'crm_test'@'127.0.0.1' IDENTIFIED BY '$databasePassword';
ALTER USER 'crm_test'@'127.0.0.1' IDENTIFIED BY '$databasePassword';
CREATE USER IF NOT EXISTS 'crm_test'@'localhost' IDENTIFIED BY '$databasePassword';
ALTER USER 'crm_test'@'localhost' IDENTIFIED BY '$databasePassword';
GRANT ALL PRIVILEGES ON servio_crm_test.* TO 'crm_test'@'127.0.0.1';
GRANT ALL PRIVILEGES ON servio_crm_test.* TO 'crm_test'@'localhost';
FLUSH PRIVILEGES;
"@
  $sql | & $client --protocol=tcp --host=127.0.0.1 --port=$port --user=root --batch
  if ($LASTEXITCODE -ne 0) { throw "Could not configure isolated MariaDB test credentials (exit $LASTEXITCODE)." }
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

Write-Host 'Isolated MariaDB 11.7 test instance is ready on 127.0.0.1:3308.' -ForegroundColor Green
Write-Host 'Run npm run test:backend from backend/ to apply migrations and run API tests.' -ForegroundColor Green
