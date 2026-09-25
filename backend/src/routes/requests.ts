import { RequestStatus, Role, Urgency } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { allowRoles, authenticate } from '../middleware/auth.js'
import { canChangeRequestStatus } from '../utils/request-status.js'

export const requestsRouter = Router()
requestsRouter.use(authenticate)
const createSchema = z.object({ storeId: z.number().int().positive(), typeId: z.number().int().positive(), urgency: z.nativeEnum(Urgency), scheduledAt: z.coerce.date().optional(), description: z.string().min(5).max(5000) })
const updateSchema = z.object({ status: z.nativeEnum(RequestStatus).optional(), adminComment: z.string().max(5000).nullable().optional(), assignedAdminId: z.number().int().positive().nullable().optional() })
const include = { store: { select: { id: true, name: true, address: true, user: { select: { id: true, ipName: true, phone: true } } } }, type: true, createdBy: { select: { id: true, ipName: true, phone: true } } } as const

requestsRouter.get('/', async (req, res) => {
  const isAdmin = req.auth!.role === Role.ADMIN
  const urgency = req.query.urgency === 'URGENT' ? Urgency.URGENT : req.query.urgency === 'SCHEDULED' ? Urgency.SCHEDULED : undefined
  const status = Object.values(RequestStatus).includes(req.query.status as RequestStatus) ? req.query.status as RequestStatus : undefined
  const storeId = Number(req.query.storeId) || undefined
  const typeId = Number(req.query.typeId) || undefined
  const userId = Number(req.query.userId) || undefined
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const dateFrom = typeof req.query.dateFrom === 'string' ? new Date(req.query.dateFrom) : undefined
  const dateTo = typeof req.query.dateTo === 'string' ? new Date(req.query.dateTo) : undefined
  const rows = await prisma.request.findMany({ where: {
    ...(isAdmin ? (userId ? { createdByUserId: userId } : {}) : { createdByUserId: req.auth!.userId }),
    ...(urgency && { urgency }), ...(status && { status }), ...(storeId && { storeId }), ...(typeId && { typeId }),
    ...(dateFrom || dateTo ? { createdAt: { ...(dateFrom && !Number.isNaN(dateFrom.getTime()) && { gte: dateFrom }), ...(dateTo && !Number.isNaN(dateTo.getTime()) && { lte: dateTo }) } } : {}),
    ...(search && { OR: [{ description: { contains: search } }, { store: { name: { contains: search } } }, { store: { address: { contains: search } } }, { createdBy: { ipName: { contains: search } } }] }),
  }, include, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }] })
  res.json(rows)
})

requestsRouter.get('/stats', allowRoles(Role.ADMIN), async (req, res) => {
  const from = typeof req.query.from === 'string' ? new Date(req.query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const to = typeof req.query.to === 'string' ? new Date(req.query.to) : new Date()
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return res.status(400).json({ message: 'Некорректный период' })
  to.setHours(23, 59, 59, 999)
  const where = { createdAt: { gte: from, lte: to } }
  const [total, byStatus, byType, urgent, activeClients] = await Promise.all([
    prisma.request.count({ where }),
    prisma.request.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.request.groupBy({ by: ['typeId'], where, _count: { _all: true } }),
    prisma.request.count({ where: { ...where, urgency: Urgency.URGENT } }),
    prisma.user.count({ where: { role: Role.CLIENT, status: 'ACTIVE' } }),
  ])
  const types = await prisma.requestType.findMany({ where: { id: { in: byType.map(item => item.typeId) } }, select: { id: true, name: true, color: true } })
  res.json({ total, urgent, activeClients, byStatus, byType: byType.map(item => ({ ...item, type: types.find(type => type.id === item.typeId) })) })
})

requestsRouter.post('/', async (req, res) => {
  const body = createSchema.parse(req.body)
  const isAdmin = req.auth!.role === Role.ADMIN
  if (!isAdmin) {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { status: true } })
    if (user?.status !== 'ACTIVE') return res.status(403).json({ message: 'Аккаунт ещё не одобрен' })
  }
  const store = await prisma.store.findFirst({
    where: { id: body.storeId, status: 'ACTIVE', ...(!isAdmin && { userId: req.auth!.userId }) },
    select: { id: true, userId: true },
  })
  if (!store) return res.status(400).json({ message: 'Выберите активную торговую точку' })
  const type = await prisma.requestType.findFirst({ where: { id: body.typeId, isActive: true } })
  if (!type) return res.status(400).json({ message: 'Тип заявки недоступен' })
  if (body.urgency === Urgency.SCHEDULED && !body.scheduledAt) return res.status(400).json({ message: 'Укажите дату плановой заявки' })
  if (body.scheduledAt && (body.scheduledAt.getTime() > Date.now() + 366 * 86400000 || body.scheduledAt.getTime() < Date.now())) return res.status(400).json({ message: 'Дата должна быть в пределах следующего года' })
  res.status(201).json(await prisma.request.create({ data: {
    ...body,
    scheduledAt: body.urgency === Urgency.URGENT ? null : body.scheduledAt,
    createdByUserId: isAdmin ? store.userId : req.auth!.userId,
    assignedAdminId: isAdmin ? req.auth!.userId : null,
  }, include }))
})

requestsRouter.patch('/:id', allowRoles(Role.ADMIN), async (req, res) => {
  const row = await prisma.request.findUnique({ where: { id: Number(req.params.id) } })
  if (!row) return res.status(404).json({ message: 'Заявка не найдена' })
  const update = updateSchema.parse(req.body)
  if (update.status && !canChangeRequestStatus(row.status, update.status)) return res.status(400).json({ message: 'Недопустимый переход статуса' })
  res.json(await prisma.request.update({ where: { id: row.id }, data: { ...update, ...((update.status === RequestStatus.DONE || update.status === RequestStatus.CANCELLED) && { closedAt: new Date() }) }, include }))
})
