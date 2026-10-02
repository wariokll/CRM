# Production deployment on Windows Server

This is the primary deployment path for this project. It uses native Windows services for the CRM API and Telegram bot, MariaDB as a Windows service, and Caddy as the HTTPS reverse proxy. Docker Compose remains available in [docker-compose.production.yml](./docker-compose.production.yml) as an alternative, but is not required.

## 1. Server preparation

Install Node.js 22 LTS, MariaDB 11.7, Caddy for Windows, NSSM (Non-Sucking Service Manager) and Git if deployment is done by cloning the repository.

Place the project outside user profiles, for example `D:\Services\BazisCrm`. Expose only ports `80` and `443` publicly. MariaDB must listen on `127.0.0.1` or a private network only; never expose port `3306` to the internet.

Before launch, point the DNS record for the production domain to the server. Caddy will obtain and renew the TLS certificate automatically.

## 2. Build, migration and secrets

Copy [backend/.env.production.example](./backend/.env.production.example) to `backend\.env` **on the server only**, then replace all placeholders. This file is ignored by Git.

Generate distinct random values for both JWT secrets, the MariaDB password and `ENCRYPTION_KEY`; replace the Telegram token before launch. Do not reuse local development secrets. Set `CLIENT_ORIGIN` and `TELEGRAM_REGISTRATION_URL` to the real HTTPS domain, and `COOKIE_SECURE=true`.

If Telegram needs a proxy, set `TELEGRAM_PROXY_URL` after proxy support is enabled in the application. Use a private HTTP CONNECT or SOCKS5 proxy only; MTProto and public shared proxies do not work for Bot API.

Build and apply migrations from an elevated PowerShell in the project root:

```powershell
npm ci
Set-Location backend
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
Set-Location ..
npm run build
```

Never run `prisma migrate dev` against production.

## 3. Run API and bot as Windows services

Copy [deploy/windows/Caddyfile](./deploy/windows/Caddyfile) to the Caddy configuration directory. Set system environment variables `CADDY_DOMAIN` and `CADDY_EMAIL`, then install Caddy as a Windows service according to its official Windows documentation.

Install CRM services from an elevated PowerShell. Replace the NSSM path if needed:

```powershell
Set-Location D:\Services\BazisCrm
.\deploy\windows\install-nssm-services.ps1 -NssmPath 'C:\Tools\nssm\win64\nssm.exe'
```

The script creates `BazisCrmApi` and `BazisCrmTelegramBot`, configures restart on failure and writes their logs into `backend\.logs`. After installation:

```powershell
Invoke-RestMethod https://crm.example.ru/api/health
Invoke-RestMethod https://crm.example.ru/api/health/telegram
Get-Service BazisCrmApi, BazisCrmTelegramBot
```

## 4. Daily backup and restoration check

Create `D:\Backups\BazisCrm`, grant write access only to the scheduled-task service account, then create a Windows Task Scheduler task that runs daily at 02:15:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File D:\Services\BazisCrm\deploy\windows\backup-mariadb.ps1 -Database servio_crm -User crm_user -Password 'replace_me'
```

Move the database password to a protected scheduled-task secret or a protected local configuration file before using this command in production; do not leave it in Task Scheduler history. The script writes compressed backups, retains 14 days by default, and supports custom paths with `-BackupDirectory` and `-RetentionDays`.

At least monthly, restore one backup into an isolated temporary MariaDB instance and verify that `SHOW TABLES` succeeds. Never test restoration against the live database.

## 5. Monitoring and release acceptance

- Monitor `https://crm.example.ru/api/health` every minute and alert after two consecutive failures.
- Monitor `https://crm.example.ru/api/health/telegram` when a bot token is configured. It returns `503` if the bot has not reached `ACTIVE` state or reports an error.
- Collect `backend\.logs\api-error.log` and `backend\.logs\telegram-bot-error.log` using the server monitoring system.
- Use a separate staging domain, database, secrets and Telegram token before each public release.
- Run frontend build, backend build and tests in CI before deploying.

## Operational commands

```powershell
Restart-Service BazisCrmApi
Restart-Service BazisCrmTelegramBot
Get-Content D:\Services\BazisCrm\backend\.logs\api-error.log -Tail 100
Get-Content D:\Services\BazisCrm\backend\.logs\telegram-bot-error.log -Tail 100
```
