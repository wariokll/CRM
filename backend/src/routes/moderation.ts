import { OrganizationStatus, PermissionKey, Role, StoreStatus, UserStatus } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../utils/permissions.js'

export const moderationRouter = Router()
moderationRouter.use(authenticate, requirePermission(PermissionKey.MANAGE_CLIENTS))

moderationRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({ where: { role: Role.CLIENT, status: UserStatus.PENDING }, include: { organizations: { include: { organization: { include: { stores: true } } } } }, orderBy: { createdAt: 'asc' } })
  res.json(users.map(user => ({ ...user, stores: user.organizations.flatMap(item => item.organization.stores) })))
})

moderationRouter.get('/organizations', async (_req, res) => {
  res.json(await prisma.organization.findMany({ where: { status: OrganizationStatus.PENDING }, include: { members: { include: { user: { select: { id: true, ipName: true, email: true, phone: true } } } }, stores: true }, orderBy: { createdAt: 'asc' } }))
})

moderationRouter.get('/stores', async (_req, res) => {
  const stores = await prisma.store.findMany({ where: { status: StoreStatus.PENDING }, include: { organization: { include: { members: { where: { isPrimary: true }, take: 1, include: { user: { select: { id: true, ipName: true, email: true, phone: true } } } } } } }, orderBy: { createdAt: 'asc' } })
  res.json(stores.map(store => ({ ...store, user: store.organization.members[0]?.user, organization: store.organization })))
})

moderationRouter.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id)
  const body = z.object({ status: z.enum([UserStatus.ACTIVE, UserStatus.REJECTED, UserStatus.BLOCKED]), rejectionReason: z.string().max(1000).optional() }).parse(req.body)
  if (body.status === UserStatus.REJECTED && !body.rejectionReason) return res.status(400).json({ message: 'Укажите причину отказа' })
  const user = await prisma.$transaction(async transaction => {
    const updated = await transaction.user.update({ where: { id }, data: { ...body, rejectionReason: body.status === UserStatus.REJECTED ? body.rejectionReason : null } })
    if (body.status === UserStatus.ACTIVE) {
      await transaction.organization.updateMany({ where: { members: { some: { userId: id } }, status: OrganizationStatus.PENDING }, data: { status: OrganizationStatus.ACTIVE, rejectionReason: null } })
      await transaction.store.updateMany({ where: { organization: { members: { some: { userId: id } } }, status: StoreStatus.PENDING }, data: { status: StoreStatus.ACTIVE, rejectionReason: null } })
    }
    return updated
  })
  res.json(user)
})

moderationRouter.patch('/organizations/:id', async (req, res) => {
  const body = z.object({ status: z.enum([OrganizationStatus.ACTIVE, OrganizationStatus.REJECTED]), rejectionReason: z.string().max(1000).optional() }).parse(req.body)
  if (body.status === OrganizationStatus.REJECTED && !body.rejectionReason?.trim()) return res.status(400).json({ message: 'Укажите причину отказа' })
  res.json(await prisma.organization.update({ where: { id: Number(req.params.id) }, data: { status: body.status, rejectionReason: body.status === OrganizationStatus.REJECTED ? body.rejectionReason : null } }))
})

moderationRouter.patch('/stores/:id', async (req, res) => {
  const body = z.object({ status: z.enum([StoreStatus.ACTIVE, StoreStatus.REJECTED]), rejectionReason: z.string().max(1000).optional() }).parse(req.body)
  if (body.status === StoreStatus.REJECTED && !body.rejectionReason?.trim()) return res.status(400).json({ message: 'Укажите причину отказа' })
  res.json(await prisma.store.update({ where: { id: Number(req.params.id) }, data: { status: body.status, rejectionReason: body.status === StoreStatus.REJECTED ? body.rejectionReason : null } }))
})
