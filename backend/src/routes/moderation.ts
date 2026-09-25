import { Role, UserStatus } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { allowRoles, authenticate } from '../middleware/auth.js'

export const moderationRouter = Router()
moderationRouter.use(authenticate, allowRoles(Role.ADMIN))
moderationRouter.get('/users', async (_req, res) => res.json(await prisma.user.findMany({ where: { status: UserStatus.PENDING }, include: { stores: true }, orderBy: { createdAt: 'asc' } })))
moderationRouter.get('/stores', async (_req, res) => res.json(await prisma.store.findMany({ where: { status: 'PENDING' }, include: { user: { select: { id: true, ipName: true, email: true, phone: true } } }, orderBy: { createdAt: 'asc' } })))
moderationRouter.patch('/users/:id', async (req, res) => { const body = z.object({ status: z.enum(['ACTIVE', 'REJECTED', 'BLOCKED']), rejectionReason: z.string().max(1000).optional() }).parse(req.body); if (body.status === 'REJECTED' && !body.rejectionReason) return res.status(400).json({ message: 'Укажите причину отказа' }); res.json(await prisma.user.update({ where: { id: Number(req.params.id) }, data: body })) })
