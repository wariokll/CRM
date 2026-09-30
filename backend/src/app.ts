import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinoHttp } from 'pino-http'
import { config } from './config.js'
import { prisma } from './db.js'
import { errorHandler } from './middleware/errors.js'
import { authRouter } from './routes/auth.js'
import { departmentsRouter } from './routes/departments.js'
import { moderationRouter } from './routes/moderation.js'
import { organizationsRouter } from './routes/organizations.js'
import { requestsRouter } from './routes/requests.js'
import { requestTypesRouter } from './routes/request-types.js'
import { staffRouter } from './routes/staff.js'
import { storesRouter } from './routes/stores.js'
import { telegramRouter } from './routes/telegram.js'
import { usersRouter } from './routes/users.js'

export const app = express()
app.use(pinoHttp())
app.use(cors({ origin: config.clientOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.get('/api/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ ok: true, database: true })
})
app.use('/api/auth', authRouter)
app.use('/api/departments', departmentsRouter)
app.use('/api/organizations', organizationsRouter)
app.use('/api/stores', storesRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/request-types', requestTypesRouter)
app.use('/api/moderation', moderationRouter)
app.use('/api/users', usersRouter)
app.use('/api/staff', staffRouter)
app.use('/api/telegram', telegramRouter)
const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist')
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(frontendDist, 'index.html')))
}
app.use(errorHandler)
