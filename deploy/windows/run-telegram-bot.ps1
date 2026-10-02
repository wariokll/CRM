param([string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path)
$ErrorActionPreference = 'Stop'
$backend = Join-Path $ProjectRoot 'backend'
Set-Location $backend
& node.exe 'dist\telegram\bot.js'
exit $LASTEXITCODE
