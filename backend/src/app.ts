import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { pinoHttp } from 'pino-http'
import { config } from './config.js'
import { errorHandler } from './middleware/errors.js'
import { authRouter } from './routes/auth.js'
import { moderationRouter } from './routes/moderation.js'
import { requestsRouter } from './routes/requests.js'
import { requestTypesRouter } from './routes/request-types.js'
import { storesRouter } from './routes/stores.js'

export const app = express()
app.use(pinoHttp())
app.use(cors({ origin: config.clientOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/stores', storesRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/request-types', requestTypesRouter)
app.use('/api/moderation', moderationRouter)
app.use(errorHandler)
