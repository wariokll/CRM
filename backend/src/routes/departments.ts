import { PermissionKey } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../utils/permissions.js'

export const departmentsRouter = Router()
departmentsRouter.use(authenticate)

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(80),
  isActive: z.boolean().optional(),
})

departmentsRouter.get('/', async (_req, res) => {
  res.json(await prisma.department.findMany({ orderBy: { name: 'asc' } }))
})

departmentsRouter.post('/', requirePermission(PermissionKey.MANAGE_STAFF), async (req, res) => {
  res.status(201).json(await prisma.department.create({ data: schema.parse(req.body) }))
})

departmentsRouter.patch('/:id', requirePermission(PermissionKey.MANAGE_STAFF), async (req, res) => {
  res.json(await prisma.department.update({ where: { id: Number(req.params.id) }, data: schema.partial().parse(req.body) }))
})
