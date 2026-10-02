import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function port(value: string | undefined) {
  const parsed = Number(value ?? 3001)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error('PORT must be a valid TCP port')
  return parsed
}

export const config = {
  port: port(process.env.PORT),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  accessSecret: required('JWT_ACCESS_SECRET'),
  refreshSecret: required('JWT_REFRESH_SECRET'),
  encryptionKey: required('ENCRYPTION_KEY'),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME ?? 'TMP_BAZIS_BOT',
  telegramRegistrationUrl: process.env.TELEGRAM_REGISTRATION_URL,
}

const localOrigin = (() => { try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(config.clientOrigin).hostname) } catch { return false } })()
if (config.isProduction && !localOrigin && !config.cookieSecure) throw new Error('COOKIE_SECURE=true is required in production')
