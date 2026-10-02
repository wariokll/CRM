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

const componentRequirement = z.object({ componentId: z.number().int().positive(), quantity: z.number().int().min(1).max(100000) })

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
  requiresComponents: z.boolean().default(false),
  defaultPriority: z.nativeEnum(Priority).default(Priority.NORMAL),
  templateFields: z.array(templateField).max(50).default([]),
  componentRequirements: z.array(componentRequirement).max(50).default([]).refine(items => new Set(items.map(item => item.componentId)).size === items.length, 'Компонент нельзя добавить в шаблон дважды'),
})

const include = { department: true, componentRequirements: { include: { component: true }, orderBy: { component: { name: 'asc' as const } } } } as const

requestTypesRouter.get('/', authenticate, async (req, res) => {
  const client = req.auth!.role === Role.CLIENT
  res.json(await prisma.requestType.findMany({ where: client ? { isActive: true, availableOnWeb: true } : {}, include, orderBy: { name: 'asc' } }))
})

requestTypesRouter.post('/', authenticate, requirePermission(PermissionKey.MANAGE_TEMPLATES), async (req, res) => {
  const { componentRequirements, ...data } = schema.parse(req.body)
  res.status(201).json(await prisma.requestType.create({ data: { ...data, componentRequirements: { create: componentRequirements } }, include }))
})

requestTypesRouter.patch('/:id', authenticate, requirePermission(PermissionKey.MANAGE_TEMPLATES), async (req, res) => {
  const { componentRequirements, ...data } = schema.partial().parse(req.body)
  res.json(await prisma.requestType.update({ where: { id: Number(req.params.id) }, data: { ...data, ...(componentRequirements && { componentRequirements: { deleteMany: {}, create: componentRequirements } }) }, include }))
})
