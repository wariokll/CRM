@echo off
setlocal
chcp 65001 >nul
set "CRM_LOG_PATH=%~dp0backend\.logs\api-out.log"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding = [Text.UTF8Encoding]::new(); $host.UI.RawUI.WindowTitle='CRM API output'; Get-Content -LiteralPath $env:CRM_LOG_PATH -Encoding UTF8 -Tail 40 -Wait"
pause
