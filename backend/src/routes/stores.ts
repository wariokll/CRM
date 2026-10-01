import { PermissionKey, Role, StoreStatus } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { prisma } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { decrypt, encrypt } from '../utils/crypto.js'
import { getUserAccess, hasPermission } from '../utils/permissions.js'

export const storesRouter = Router()
storesRouter.use(authenticate)

const storeSchema = z.object({ organizationId: z.number().int().positive(), name: z.string().min(2), address: z.string().min(5), phone: z.string().optional().nullable() })
const accessSchema = z.object({ anydeskId: z.string().max(80).optional().nullable(), anydeskPassword: z.string().max(300).optional().nullable(), ofdUrl: z.string().url().optional().nullable(), ofdLogin: z.string().max(200).optional().nullable(), ofdPassword: z.string().max(300).optional().nullable(), nalogUrl: z.string().url().optional().nullable(), nalogLogin: z.string().max(200).optional().nullable(), nalogPassword: z.string().max(300).optional().nullable() })

const include = {
  organization: { include: { members: { where: { isPrimary: true }, take: 1, include: { user: { select: { id: true, ipName: true, phone: true, status: true } } } } } },
  access: { select: { anydeskId: true, ofdUrl: true, ofdLogin: true, nalogUrl: true, nalogLogin: true, updatedAt: true } },
  _count: { select: { requests: true } },
} as const

function present<T extends { organization: { legalName: string; members: Array<{ user: unknown }> } }>(store: T) {
  return { ...store, user: store.organization.members[0]?.user ?? { id: 0, ipName: store.organization.legalName, phone: '', status: 'ACTIVE' } }
}

async function canUseOrganization(userId: number, organizationId: number, managePermission: PermissionKey = PermissionKey.MANAGE_STORES) {
  const access = await getUserAccess(userId)
  if (!access) return false
  if (access.role !== Role.CLIENT && hasPermission(access, managePermission)) return true
  if (access.role !== Role.CLIENT && managePermission === PermissionKey.VIEW_STORE_SECRETS && hasPermission(access, PermissionKey.VIEW_STORE_SECRETS)) return true
  return Boolean(await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId } } }))
}

async function visibleStore(id: number, userId: number, permission: PermissionKey = PermissionKey.MANAGE_STORES) {
  const store = await prisma.store.findUnique({ where: { id } })
  if (!store || !(await canUseOrganization(userId, store.organizationId, permission))) return null
  return store
}

storesRouter.get('/', async (req, res) => {
  const access = await getUserAccess(req.auth!.userId)
  if (!access) return res.status(401).json({ message: 'Пользователь не найден' })
  const where = access.role === Role.CLIENT ? { organization: { members: { some: { userId: req.auth!.userId } } } } : {}
  const stores = await prisma.store.findMany({ where, include, orderBy: { updatedAt: 'desc' } })
  res.json(stores.map(present))
})

storesRouter.post('/', async (req, res) => {
  const body = storeSchema.parse(req.body)
  const access = await getUserAccess(req.auth!.userId)
  if (!access || !(await canUseOrganization(req.auth!.userId, body.organizationId))) return res.status(403).json({ message: 'Нет доступа к организации' })
  const activeImmediately = access.role !== Role.CLIENT && hasPermission(access, PermissionKey.MANAGE_STORES)
  const store = await prisma.store.create({ data: { ...body, userId: access.role === Role.CLIENT ? req.auth!.userId : null, status: activeImmediately ? StoreStatus.ACTIVE : StoreStatus.PENDING }, include })
  res.status(201).json(present(store))
})

storesRouter.patch('/:id', async (req, res) => {
  const store = await visibleStore(Number(req.params.id), req.auth!.userId)
  if (!store) return res.status(404).json({ message: 'Точка не найдена' })
  const body = storeSchema.partial().parse(req.body)
  if (body.organizationId && !(await canUseOrganization(req.auth!.userId, body.organizationId))) return res.status(403).json({ message: 'Нет доступа к организации' })
  const access = await getUserAccess(req.auth!.userId)
  const updated = await prisma.store.update({ where: { id: store.id }, data: { ...body, ...(access?.role === Role.CLIENT && { status: StoreStatus.PENDING }) }, include })
  res.json(present(updated))
})

storesRouter.get('/:id/access', async (req, res) => {
  const store = await visibleStore(Number(req.params.id), req.auth!.userId, PermissionKey.VIEW_STORE_SECRETS)
  if (!store) return res.status(404).json({ message: 'Точка не найдена' })
  const access = await prisma.storeAccess.findUnique({ where: { storeId: store.id } })
  if (!access) return res.json(null)
  res.json({ ...access, anydeskPassword: access.anydeskPasswordEncrypted && decrypt(access.anydeskPasswordEncrypted, config.encryptionKey), ofdPassword: access.ofdPasswordEncrypted && decrypt(access.ofdPasswordEncrypted, config.encryptionKey), nalogPassword: access.nalogPasswordEncrypted && decrypt(access.nalogPasswordEncrypted, config.encryptionKey), anydeskPasswordEncrypted: undefined, ofdPasswordEncrypted: undefined, nalogPasswordEncrypted: undefined })
})

storesRouter.put('/:id/access', async (req, res) => {
  const store = await prisma.store.findUnique({ where: { id: Number(req.params.id) } })
  const access = await getUserAccess(req.auth!.userId)
  if (!store || !access || access.status !== 'ACTIVE' || access.role === Role.CLIENT) return res.status(404).json({ message: 'Точка не найдена или доступна только сотрудникам' })
  const body = accessSchema.parse(req.body)
  const data = { anydeskId: body.anydeskId, ofdUrl: body.ofdUrl, ofdLogin: body.ofdLogin, nalogUrl: body.nalogUrl, nalogLogin: body.nalogLogin, ...(body.anydeskPassword !== undefined && { anydeskPasswordEncrypted: body.anydeskPassword ? encrypt(body.anydeskPassword, config.encryptionKey) : null }), ...(body.ofdPassword !== undefined && { ofdPasswordEncrypted: body.ofdPassword ? encrypt(body.ofdPassword, config.encryptionKey) : null }), ...(body.nalogPassword !== undefined && { nalogPasswordEncrypted: body.nalogPassword ? encrypt(body.nalogPassword, config.encryptionKey) : null }), updatedByUserId: req.auth!.userId }
  await prisma.storeAccess.upsert({ where: { storeId: store.id }, create: { storeId: store.id, ...data }, update: data })
  res.status(204).end()
})

storesRouter.post('/:id/approve', async (req, res) => {
  const access = await getUserAccess(req.auth!.userId)
  if (!access || access.status !== 'ACTIVE' || access.role === Role.CLIENT) return res.status(403).json({ message: 'Принять точку может только активный сотрудник' })
  const store = await prisma.store.findFirst({ where: { id: Number(req.params.id), status: StoreStatus.PENDING }, select: { id: true } })
  if (!store) return res.status(404).json({ message: 'Точка на модерации не найдена' })
  res.json(await prisma.store.update({ where: { id: store.id }, data: { status: StoreStatus.ACTIVE, rejectionReason: null } }))
})

storesRouter.post('/:id/reject', async (req, res) => {
  const access = await getUserAccess(req.auth!.userId)
  if (!access || access.status !== 'ACTIVE' || access.role === Role.CLIENT) return res.status(403).json({ message: 'Отклонить точку может только активный сотрудник' })
  const body = z.object({ rejectionReason: z.string().trim().min(3).max(1000) }).parse(req.body)
  const store = await prisma.store.findFirst({ where: { id: Number(req.params.id), status: StoreStatus.PENDING }, select: { id: true } })
  if (!store) return res.status(404).json({ message: 'Точка на модерации не найдена' })
  res.json(await prisma.store.update({ where: { id: store.id }, data: { status: StoreStatus.REJECTED, rejectionReason: body.rejectionReason } }))
})
