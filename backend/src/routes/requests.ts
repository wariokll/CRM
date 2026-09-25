import { RequestStatus, Role, Urgency } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { allowRoles, authenticate } from '../middleware/auth.js'

export const requestsRouter = Router()
requestsRouter.use(authenticate)
const createSchema = z.object({ storeId: z.number().int().positive(), typeId: z.number().int().positive(), urgency: z.nativeEnum(Urgency), scheduledAt: z.coerce.date().optional(), description: z.string().min(5).max(5000) })
const updateSchema = z.object({ status: z.nativeEnum(RequestStatus).optional(), adminComment: z.string().max(5000).nullable().optional(), assignedAdminId: z.number().int().positive().nullable().optional() })
const include = { store: { select: { id: true, name: true, address: true, user: { select: { id: true, ipName: true, phone: true } } } }, type: true, createdBy: { select: { id: true, ipName: true, phone: true } } } as const

requestsRouter.get('/', async (req, res) => {
  const isAdmin = req.auth!.role === Role.ADMIN
  const urgency = req.query.urgency === 'URGENT' ? Urgency.URGENT : req.query.urgency === 'SCHEDULED' ? Urgency.SCHEDULED : undefined
  const status = Object.values(RequestStatus).includes(req.query.status as RequestStatus) ? req.query.status as RequestStatus : undefined
  const rows = await prisma.request.findMany({ where: { ...(isAdmin ? {} : { createdByUserId: req.auth!.userId }), ...(urgency && { urgency }), ...(status && { status }) }, include, orderBy: [{ urgency: 'asc' }, { scheduledAt: 'asc' }, { createdAt: 'desc' }] })
  res.json(rows)
})

requestsRouter.post('/', async (req, res) => {
  if (req.auth!.role !== Role.CLIENT) return res.status(403).json({ message: 'Заявку создаёт клиент' })
  const body = createSchema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { status: true } })
  if (user?.status !== 'ACTIVE') return res.status(403).json({ message: 'Аккаунт ещё не одобрен' })
  const store = await prisma.store.findFirst({ where: { id: body.storeId, userId: req.auth!.userId, status: 'ACTIVE' } })
  if (!store) return res.status(400).json({ message: 'Выберите активную торговую точку' })
  const type = await prisma.requestType.findFirst({ where: { id: body.typeId, isActive: true } })
  if (!type) return res.status(400).json({ message: 'Тип заявки недоступен' })
  if (body.urgency === Urgency.SCHEDULED && !body.scheduledAt) return res.status(400).json({ message: 'Укажите дату плановой заявки' })
  if (body.scheduledAt && (body.scheduledAt.getTime() > Date.now() + 366 * 86400000 || body.scheduledAt.getTime() < Date.now())) return res.status(400).json({ message: 'Дата должна быть в пределах следующего года' })
  res.status(201).json(await prisma.request.create({ data: { ...body, scheduledAt: body.urgency === Urgency.URGENT ? null : body.scheduledAt, createdByUserId: req.auth!.userId }, include }))
})

requestsRouter.patch('/:id', allowRoles(Role.ADMIN), async (req, res) => {
  const row = await prisma.request.findUnique({ where: { id: Number(req.params.id) } })
  if (!row) return res.status(404).json({ message: 'Заявка не найдена' })
  const update = updateSchema.parse(req.body)
  const valid: Record<RequestStatus, RequestStatus[]> = { NEW: [RequestStatus.ACCEPTED, RequestStatus.CANCELLED], ACCEPTED: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED], IN_PROGRESS: [RequestStatus.DONE, RequestStatus.CANCELLED], DONE: [], CANCELLED: [] }
  if (update.status && update.status !== row.status && !valid[row.status].includes(update.status)) return res.status(400).json({ message: 'Недопустимый переход статуса' })
  res.json(await prisma.request.update({ where: { id: row.id }, data: { ...update, ...(update.status === RequestStatus.DONE && { closedAt: new Date() }) }, include }))
})
