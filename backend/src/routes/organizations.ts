import { OrganizationStatus, OrganizationType, PermissionKey, Role } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { getUserAccess, hasPermission } from '../utils/permissions.js'

export const organizationsRouter = Router()
organizationsRouter.use(authenticate)

const optionalText = (max: number) => z.preprocess(value => typeof value === 'string' && !value.trim() ? null : value, z.string().trim().max(max).optional().nullable())
const optionalEmail = z.preprocess(value => typeof value === 'string' && !value.trim() ? null : value, z.string().email().optional().nullable())

const schema = z.object({
  type: z.nativeEnum(OrganizationType),
  legalName: z.string().trim().min(2).max(250),
  shortName: optionalText(200),
  inn: optionalText(20),
  kpp: optionalText(20),
  ogrn: optionalText(20),
  legalAddress: optionalText(1000),
  contactName: optionalText(200),
  phone: optionalText(50),
  email: optionalEmail,
})

const include = {
  members: { include: { user: { select: { id: true, ipName: true, email: true, phone: true, status: true } } } },
  stores: { orderBy: { name: 'asc' as const } },
  _count: { select: { requests: true } },
} as const

async function context(userId: number) {
  const access = await getUserAccess(userId)
  if (!access) return null
  return { access, manages: hasPermission(access, PermissionKey.MANAGE_ORGANIZATIONS) }
}

organizationsRouter.get('/', async (req, res) => {
  const ctx = await context(req.auth!.userId)
  if (!ctx) return res.status(401).json({ message: 'Пользователь не найден' })
  const where = ctx.manages || ctx.access.role !== Role.CLIENT ? {} : { members: { some: { userId: req.auth!.userId } } }
  res.json(await prisma.organization.findMany({ where, include, orderBy: { legalName: 'asc' } }))
})

organizationsRouter.post('/', async (req, res) => {
  const ctx = await context(req.auth!.userId)
  if (!ctx) return res.status(401).json({ message: 'Пользователь не найден' })
  const body = schema.parse(req.body)
  const requestedMembers = z.array(z.number().int().positive()).optional().parse(req.body.memberIds)
  const memberIds = ctx.manages && requestedMembers?.length ? [...new Set(requestedMembers)] : [req.auth!.userId]
  const organization = await prisma.organization.create({ data: {
    ...body,
    status: ctx.manages ? OrganizationStatus.ACTIVE : OrganizationStatus.PENDING,
    createdByUserId: req.auth!.userId,
    members: { create: memberIds.map((userId, index) => ({ userId, isPrimary: index === 0 })) },
  }, include })
  res.status(201).json(organization)
})

organizationsRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const ctx = await context(req.auth!.userId)
  if (!ctx) return res.status(401).json({ message: 'Пользователь не найден' })
  const existing = await prisma.organization.findUnique({ where: { id }, select: { members: { where: { userId: req.auth!.userId }, select: { userId: true } } } })
  if (!existing || (!ctx.manages && !existing.members.length)) return res.status(404).json({ message: 'Организация не найдена' })
  const data = schema.partial().parse(req.body)
  res.json(await prisma.organization.update({ where: { id }, data: { ...data, ...(!ctx.manages && { status: OrganizationStatus.PENDING }) }, include }))
})

organizationsRouter.put('/:id/members', async (req, res) => {
  const ctx = await context(req.auth!.userId)
  if (!ctx?.manages) return res.status(403).json({ message: 'Недостаточно прав' })
  const id = Number(req.params.id)
  const memberIds = [...new Set(z.object({ userIds: z.array(z.number().int().positive()).min(1) }).parse(req.body).userIds)]
  await prisma.$transaction(async transaction => {
    await transaction.organizationMember.deleteMany({ where: { organizationId: id } })
    await transaction.organizationMember.createMany({ data: memberIds.map((userId, index) => ({ organizationId: id, userId, isPrimary: index === 0 })) })
  })
  res.json(await prisma.organization.findUniqueOrThrow({ where: { id }, include }))
})

organizationsRouter.post('/:id/approve', async (req, res) => {
  const access = await getUserAccess(req.auth!.userId)
  if (!access || access.status !== 'ACTIVE' || access.role === Role.CLIENT) return res.status(403).json({ message: 'Принять организацию может только активный сотрудник' })
  const organization = await prisma.organization.findFirst({ where: { id: Number(req.params.id), status: OrganizationStatus.PENDING }, select: { id: true } })
  if (!organization) return res.status(404).json({ message: 'Организация на модерации не найдена' })
  res.json(await prisma.organization.update({ where: { id: organization.id }, data: { status: OrganizationStatus.ACTIVE, rejectionReason: null }, include }))
})

organizationsRouter.post('/:id/reject', async (req, res) => {
  const access = await getUserAccess(req.auth!.userId)
  if (!access || access.status !== 'ACTIVE' || access.role === Role.CLIENT) return res.status(403).json({ message: 'Отклонить организацию может только активный сотрудник' })
  const body = z.object({ rejectionReason: z.string().trim().min(3).max(1000) }).parse(req.body)
  const organization = await prisma.organization.findFirst({ where: { id: Number(req.params.id), status: OrganizationStatus.PENDING }, select: { id: true } })
  if (!organization) return res.status(404).json({ message: 'Организация на модерации не найдена' })
  res.json(await prisma.organization.update({ where: { id: organization.id }, data: { status: OrganizationStatus.REJECTED, rejectionReason: body.rejectionReason }, include }))
})
