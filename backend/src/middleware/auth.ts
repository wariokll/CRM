import type { NextFunction, Request, Response } from 'express'
import { Role } from '@prisma/client'
import { verifyAccessToken } from '../utils/tokens.js'

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ message: 'Требуется авторизация' })
  try { req.auth = verifyAccessToken(token); next() }
  catch { return res.status(401).json({ message: 'Сессия истекла. Войдите снова.' }) }
}

export function allowRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ message: 'Недостаточно прав' })
    next()
  }
}
