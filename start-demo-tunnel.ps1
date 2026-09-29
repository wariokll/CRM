$ErrorActionPreference = 'Stop'

if (-not (Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue)) {
  throw 'Сначала запустите CRM командой npm start.'
}

Write-Host 'Создаю временную публичную HTTPS-ссылку...' -ForegroundColor Cyan
Write-Host 'Не закрывайте это окно во время демонстрации. Для остановки нажмите Ctrl+C.' -ForegroundColor Yellow

& "$env:WINDIR\System32\OpenSSH\ssh.exe" `
  -o StrictHostKeyChecking=accept-new `
  -o ServerAliveInterval=30 `
  -o ExitOnForwardFailure=yes `
  -R 80:localhost:3001 `
  nokey@localhost.run
