import { Role } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { allowRoles, authenticate } from '../middleware/auth.js'

export const requestTypesRouter = Router()
const schema = z.object({ name: z.string().min(2).max(100), description: z.string().max(1000).nullable().optional(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), isActive: z.boolean().optional() })
requestTypesRouter.get('/', authenticate, async (req, res) => res.json(await prisma.requestType.findMany({ where: req.auth!.role === Role.ADMIN ? {} : { isActive: true }, orderBy: { name: 'asc' } })))
requestTypesRouter.post('/', authenticate, allowRoles(Role.ADMIN), async (req, res) => res.status(201).json(await prisma.requestType.create({ data: schema.parse(req.body) })))
requestTypesRouter.patch('/:id', authenticate, allowRoles(Role.ADMIN), async (req, res) => res.json(await prisma.requestType.update({ where: { id: Number(req.params.id) }, data: schema.partial().parse(req.body) })))
