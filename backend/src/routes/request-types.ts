import { PermissionKey, Priority, Role } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../utils/permissions.js'

export const requestTypesRouter = Router()

const templateField = z.object({
  key: z.string().trim().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/).max(80),
  label: z.string().trim().min(1).max(150),
  type: z.enum(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'CHECKBOX', 'FILE']),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
})

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(1000).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isActive: z.boolean().optional(),
  departmentId: z.number().int().positive(),
  requiresOrganization: z.boolean().default(true),
  requiresStore: z.boolean().default(true),
  availableOnWeb: z.boolean().default(true),
  availableOnTelegram: z.boolean().default(true),
  defaultPriority: z.nativeEnum(Priority).default(Priority.NORMAL),
  templateFields: z.array(templateField).max(50).default([]),
})

requestTypesRouter.get('/', authenticate, async (req, res) => {
  const client = req.auth!.role === Role.CLIENT
  res.json(await prisma.requestType.findMany({ where: client ? { isActive: true, availableOnWeb: true } : {}, include: { department: true }, orderBy: { name: 'asc' } }))
})

requestTypesRouter.post('/', authenticate, requirePermission(PermissionKey.MANAGE_TEMPLATES), async (req, res) => {
  res.status(201).json(await prisma.requestType.create({ data: schema.parse(req.body), include: { department: true } }))
})

requestTypesRouter.patch('/:id', authenticate, requirePermission(PermissionKey.MANAGE_TEMPLATES), async (req, res) => {
  res.json(await prisma.requestType.update({ where: { id: Number(req.params.id) }, data: schema.partial().parse(req.body), include: { department: true } }))
})
