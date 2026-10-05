param(
	[string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
	[string]$NodePath = (Get-Command 'node.exe' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
)
$ErrorActionPreference = 'Stop'
$backend = Join-Path $ProjectRoot 'backend'
Set-Location $backend
if (-not $NodePath -or -not (Test-Path -LiteralPath $NodePath)) { throw 'Node.js executable was not found. Pass it with -NodePath.' }
& $NodePath 'dist\server.js'
exit $LASTEXITCODE
