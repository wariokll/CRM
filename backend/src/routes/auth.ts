import { Role, UserStatus } from '@prisma/client'
import bcrypt from 'bcrypt'
import { Router, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { config } from '../config.js'
import { prisma } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../utils/tokens.js'

export const authRouter = Router()
const registerSchema = z.object({ ipName: z.string().min(2), email: z.string().email(), password: z.string().min(8), phone: z.string().min(5), store: z.object({ name: z.string().min(2), address: z.string().min(5), phone: z.string().optional() }) })
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
const publicUser = { id: true, ipName: true, email: true, phone: true, role: true, status: true, rejectionReason: true, createdAt: true } as const

function attachRefresh(res: Response, token: string) {
  res.cookie('refreshToken', token, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, maxAge: 30 * 24 * 60 * 60 * 1000, path: '/api/auth' })
}

authRouter.post('/register', async (req, res) => {
  const body = registerSchema.parse(req.body)
  const passwordHash = await bcrypt.hash(body.password, 12)
  const user = await prisma.user.create({ data: { ipName: body.ipName, email: body.email.toLowerCase(), passwordHash, phone: body.phone, status: UserStatus.PENDING, role: Role.CLIENT, stores: { create: { ...body.store } } }, select: publicUser })
  res.status(201).json({ user, message: 'Заявка на регистрацию отправлена на модерацию' })
})

authRouter.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }), async (req, res) => {
  const body = loginSchema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) return res.status(401).json({ message: 'Неверный email или пароль' })
  if (user.status === UserStatus.BLOCKED) return res.status(403).json({ message: 'Аккаунт заблокирован' })
  const payload = { userId: user.id, role: user.role }
  attachRefresh(res, createRefreshToken(payload))
  return res.json({ accessToken: createAccessToken(payload), user: { ...user, passwordHash: undefined } })
})

authRouter.post('/refresh', async (req, res) => {
  try {
    const payload = verifyRefreshToken(req.cookies.refreshToken)
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: publicUser })
    if (!user || user.status === UserStatus.BLOCKED) throw new Error('blocked')
    return res.json({ accessToken: createAccessToken({ userId: user.id, role: user.role }), user })
  } catch { return res.status(401).json({ message: 'Сессия истекла' }) }
})

authRouter.post('/logout', (_req, res) => { res.clearCookie('refreshToken', { path: '/api/auth' }); res.status(204).end() })
authRouter.get('/me', authenticate, async (req, res) => res.json(await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: publicUser })))
