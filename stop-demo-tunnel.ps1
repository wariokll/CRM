$tunnels = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'ssh.exe' -and $_.CommandLine -like '*nokey@localhost.run*' -and $_.CommandLine -like '*localhost:3001*'
}

if (-not $tunnels) {
  Write-Host 'Активный демонстрационный туннель не найден.'
  exit 0
}

$tunnels | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
Write-Host 'Демонстрационный туннель остановлен.'
