import { CommentVisibility, PermissionKey, Priority, RequestSource, RequestStatus, Role, Urgency, type Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { canChangeRequestStatus } from '../utils/request-status.js'
import { notifyRequestAssignees, notifyRequestClient } from '../utils/telegram-notifications.js'
import { getUserAccess, hasPermission, requirePermission } from '../utils/permissions.js'
import { buildRequestReport, parseReportPeriod } from '../modules/requests/reports.service.js'
import { canManageRequest, requestVisibilityWhere } from '../modules/requests/request-policy.js'
import { createRequestSchema, updateRequestSchema, validateRequiredTemplateFields } from '../modules/requests/request.contracts.js'
import { requestInclude } from '../modules/requests/request.include.js'

export const requestsRouter = Router()
requestsRouter.use(authenticate)

requestsRouter.get('/assignees', async (req, res) => {
  const access = await getUserAccess(req.auth!.userId)
  if (!access || access.role === Role.CLIENT) return res.status(403).json({ message: 'Недостаточно прав' })
  const departmentId = Number(req.query.departmentId) || undefined
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE', OR: [
      { role: Role.DIRECTOR },
      { role: { in: [Role.MASTER, Role.DEPARTMENT_HEAD] }, ...(departmentId && { departmentMemberships: { some: { departmentId } } }) },
    ] },
    select: { id: true, ipName: true, email: true, role: true, departmentMemberships: { include: { department: true } } },
    orderBy: { ipName: 'asc' },
  })
  res.json(users)
})

requestsRouter.get('/', async (req, res) => {
  const access = await getUserAccess(req.auth!.userId)
  if (!access) return res.status(401).json({ message: 'Пользователь не найден' })
  const urgency = req.query.urgency === 'URGENT' ? Urgency.URGENT : req.query.urgency === 'SCHEDULED' ? Urgency.SCHEDULED : undefined
  const status = Object.values(RequestStatus).includes(req.query.status as RequestStatus) ? req.query.status as RequestStatus : undefined
  const priority = Object.values(Priority).includes(req.query.priority as Priority) ? req.query.priority as Priority : undefined
  const storeId = Number(req.query.storeId) || undefined
  const typeId = Number(req.query.typeId) || undefined
  const departmentId = Number(req.query.departmentId) || undefined
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const rows = await prisma.request.findMany({ where: {
    AND: [requestVisibilityWhere(access)],
    ...(urgency && { urgency }), ...(status && { status }), ...(priority && { priority }), ...(storeId && { storeId }), ...(typeId && { typeId }), ...(departmentId && { departmentId }),
    ...(search && { OR: [{ description: { contains: search } }, { store: { name: { contains: search } } }, { store: { address: { contains: search } } }, { organization: { legalName: { contains: search } } }, { createdBy: { ipName: { contains: search } } }] }),
  }, include: requestInclude, orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }, { createdAt: 'desc' }] })
  res.json(rows.map(row => access.role === Role.CLIENT ? { ...row, comments: row.comments.filter(comment => comment.visibility === CommentVisibility.CLIENT) } : row))
})

requestsRouter.get('/stats', requirePermission(PermissionKey.VIEW_REPORTS), async (req, res) => {
  try { const { from, to } = parseReportPeriod(req.query.from, req.query.to); res.json(await buildRequestReport(req.access!, from, to)) }
  catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : 'Некорректный период' }) }
})

requestsRouter.post('/', async (req, res) => {
  const body = createRequestSchema.parse(req.body)
  const access = await getUserAccess(req.auth!.userId)
  if (!access || access.status !== 'ACTIVE') return res.status(403).json({ message: 'Аккаунт ещё не одобрен' })
  const type = await prisma.requestType.findFirst({ where: { id: body.typeId, isActive: true }, include: { department: true } })
  if (!type) return res.status(400).json({ message: 'Тип заявки недоступен' })
  let store = body.storeId ? await prisma.store.findFirst({ where: { id: body.storeId, status: 'ACTIVE' }, include: { organization: { include: { members: true } } } }) : null
  const organizationId = body.organizationId ?? store?.organizationId ?? null
  if (type.requiresStore && !store) return res.status(400).json({ message: 'Для этого типа заявки выберите торговую точку' })
  if (type.requiresOrganization && !organizationId) return res.status(400).json({ message: 'Для этого типа заявки выберите организацию' })
  if (organizationId && !store) {
    const organization = await prisma.organization.findFirst({ where: { id: organizationId, status: 'ACTIVE' }, select: { id: true } })
    if (!organization) return res.status(400).json({ message: 'Выбранная организация не найдена или ещё не принята. Выберите активную организацию.' })
  }
  if (store && organizationId && store.organizationId !== organizationId) return res.status(400).json({ message: 'Точка не относится к выбранной организации' })
  if (access.role === Role.CLIENT && organizationId) {
    const membership = await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId: access.userId } } })
    if (!membership) return res.status(403).json({ message: 'Нет доступа к организации' })
  }
  if (body.urgency === Urgency.SCHEDULED && !body.scheduledAt) return res.status(400).json({ message: 'Укажите дату плановой заявки' })
  if (body.scheduledAt && (body.scheduledAt.getTime() > Date.now() + 366 * 86400000 || body.scheduledAt.getTime() < Date.now())) return res.status(400).json({ message: 'Дата должна быть в пределах следующего года' })
  try { validateRequiredTemplateFields(type.templateFields, body.templateData ?? {}) } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : 'Заполните обязательные поля' }) }
  const requestedDepartment = body.departmentId ?? type.departmentId
  if (access.role === Role.CLIENT && requestedDepartment !== type.departmentId) return res.status(403).json({ message: 'Отдел определяется шаблоном заявки' })
  const primaryMember = organizationId ? await prisma.organizationMember.findFirst({ where: { organizationId }, orderBy: { isPrimary: 'desc' } }) : null
  const createdByUserId = access.role === Role.CLIENT ? access.userId : primaryMember?.userId ?? access.userId
  const priority = access.role !== Role.CLIENT && hasPermission(access, PermissionKey.SET_PRIORITY) ? body.priority ?? type.defaultPriority : type.defaultPriority
  const request = await prisma.$transaction(async transaction => {
    const created = await transaction.request.create({ data: {
      storeId: store?.id ?? null,
      organizationId,
      createdByUserId,
      typeId: type.id,
      departmentId: requestedDepartment,
      urgency: body.urgency,
      priority,
      source: body.source ?? RequestSource.WEB,
      scheduledAt: body.urgency === Urgency.URGENT ? null : body.scheduledAt,
      description: body.description,
      templateData: body.templateData as Prisma.InputJsonValue | undefined,
    } })
    await transaction.requestDepartmentHistory.create({ data: { requestId: created.id, toDepartmentId: requestedDepartment, transferredByUserId: access.userId } })
    await transaction.requestActivity.create({ data: { requestId: created.id, authorUserId: access.userId, kind: 'CREATED', message: 'Заявка создана' } })
    return transaction.request.findUniqueOrThrow({ where: { id: created.id }, include: requestInclude })
  })
  res.status(201).json(request)
})

requestsRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const access = await getUserAccess(req.auth!.userId)
  if (!access || access.role === Role.CLIENT) return res.status(403).json({ message: 'Недостаточно прав' })
  const row = await prisma.request.findFirst({ where: { id, AND: [requestVisibilityWhere(access)] }, include: { assignees: true, type: { select: { name: true } } } })
  if (!row) return res.status(404).json({ message: 'Заявка не найдена' })
  const update = updateRequestSchema.parse(req.body)
  const managesCurrent = canManageRequest(access, row.departmentId)
  const isAssignedMaster = access.role === Role.MASTER && row.assignees.some(assignee => assignee.userId === access.userId)
  if (!managesCurrent && !isAssignedMaster) return res.status(403).json({ message: 'Сначала возьмите заявку в работу: сейчас доступен просмотр и комментарии' })
  if (update.status) {
    if (update.status === RequestStatus.CANCELLED && !hasPermission(access, PermissionKey.CANCEL_REQUESTS)) return res.status(403).json({ message: 'Отменить заявку может руководитель или начальник отдела' })
    if (!canChangeRequestStatus(row.status, update.status)) return res.status(400).json({ message: 'Недопустимый переход статуса' })
  }
  if (update.priority && (!managesCurrent || !hasPermission(access, PermissionKey.SET_PRIORITY))) return res.status(403).json({ message: 'Недостаточно прав для изменения приоритета' })
  if (update.departmentId && update.departmentId !== row.departmentId && (!managesCurrent || !hasPermission(access, PermissionKey.TRANSFER_REQUESTS))) return res.status(403).json({ message: 'Недостаточно прав для передачи заявки' })
  if (update.assigneeIds && (!managesCurrent || !hasPermission(access, PermissionKey.ASSIGN_MASTERS))) return res.status(403).json({ message: 'Недостаточно прав для назначения мастеров' })

  await prisma.$transaction(async transaction => {
    const nextDepartmentId = update.departmentId ?? row.departmentId
    if (update.departmentId && update.departmentId !== row.departmentId) {
      await transaction.requestDepartmentHistory.create({ data: { requestId: row.id, fromDepartmentId: row.departmentId, toDepartmentId: update.departmentId, transferredByUserId: access.userId } })
      await transaction.requestAssignee.deleteMany({ where: { requestId: row.id } })
    }
    if (update.assigneeIds) {
      const ids = [...new Set(update.assigneeIds)]
      const eligible = await transaction.user.findMany({ where: { id: { in: ids }, status: 'ACTIVE', OR: [
        { role: Role.DIRECTOR },
        { role: { in: [Role.MASTER, Role.DEPARTMENT_HEAD] }, departmentMemberships: { some: { departmentId: nextDepartmentId } } },
      ] }, select: { id: true } })
      if (eligible.length !== ids.length) throw new Error('Выбранный сотрудник не состоит в отделе заявки или недоступен')
      await transaction.requestAssignee.deleteMany({ where: { requestId: row.id } })
      if (ids.length) await transaction.requestAssignee.createMany({ data: ids.map(userId => ({ requestId: row.id, userId, assignedByUserId: access.userId })) })
    }
    await transaction.request.update({ where: { id: row.id }, data: {
      ...(update.status && { status: update.status }),
      ...(update.priority && { priority: update.priority }),
      ...(update.departmentId && { departmentId: update.departmentId }),
      ...(update.adminComment !== undefined && { adminComment: update.adminComment }),
      ...((update.status === RequestStatus.DONE || update.status === RequestStatus.CANCELLED) && { closedAt: new Date() }),
    } })
    const statusLabels: Record<RequestStatus, string> = { NEW: 'Новая', ACCEPTED: 'Принята', IN_PROGRESS: 'В работе', DONE: 'Выполнена', CANCELLED: 'Отменена' }
    const priorityLabels: Record<Priority, string> = { LOW: 'низкий', NORMAL: 'обычный', HIGH: 'высокий', CRITICAL: 'критический' }
    if (update.status && update.status !== row.status) await transaction.requestActivity.create({ data: { requestId: row.id, authorUserId: access.userId, kind: 'STATUS_CHANGED', message: `Статус изменён: «${statusLabels[row.status]}» → «${statusLabels[update.status]}»` } })
    if (update.priority && update.priority !== row.priority) await transaction.requestActivity.create({ data: { requestId: row.id, authorUserId: access.userId, kind: 'PRIORITY_CHANGED', message: `Приоритет изменён: «${priorityLabels[row.priority]}» → «${priorityLabels[update.priority]}»` } })
    if (update.departmentId && update.departmentId !== row.departmentId) await transaction.requestActivity.create({ data: { requestId: row.id, authorUserId: access.userId, kind: 'DEPARTMENT_CHANGED', message: 'Заявка передана в другой отдел' } })
    if (update.assigneeIds) await transaction.requestActivity.create({ data: { requestId: row.id, authorUserId: access.userId, kind: 'ASSIGNEES_CHANGED', message: update.assigneeIds.length ? 'Исполнители обновлены' : 'Исполнители сняты с заявки' } })
    if (update.adminComment?.trim()) await transaction.requestComment.create({ data: { requestId: row.id, authorUserId: access.userId, visibility: CommentVisibility.CLIENT, body: update.adminComment.trim() } })
  })
  if (update.status && update.status !== row.status) {
    const labels: Record<RequestStatus, string> = { NEW: 'Новая', ACCEPTED: 'Принята', IN_PROGRESS: 'В работе', DONE: 'Выполнена', CANCELLED: 'Отменена' }
    void notifyRequestClient(row.id, `Заявка #${row.id}: статус изменён на «${labels[update.status]}».`)
    void notifyRequestAssignees(row.id, `Заявка «${row.type.name}»: статус изменён на «${labels[update.status]}».`)
  }
  if (update.adminComment?.trim()) void notifyRequestClient(row.id, `Новый комментарий по заявке #${row.id}:\n${update.adminComment.trim()}`)
  if (update.assigneeIds?.length) void notifyRequestAssignees(row.id, `Вам назначена заявка «${row.type.name}». Откройте БАЗИС CRM для деталей.`)
  res.json(await prisma.request.findUniqueOrThrow({ where: { id: row.id }, include: requestInclude }))
})

requestsRouter.post('/:id/assignees/self', async (req, res) => {
  const id = Number(req.params.id)
  const access = await getUserAccess(req.auth!.userId)
  if (!access || access.role === Role.CLIENT) return res.status(403).json({ message: 'Недостаточно прав' })
  const row = await prisma.request.findUnique({ where: { id }, select: { departmentId: true, type: { select: { name: true } } } })
  if (!row || !access.departmentIds.includes(row.departmentId)) return res.status(404).json({ message: 'Заявка вашего отдела не найдена' })
  await prisma.requestAssignee.upsert({ where: { requestId_userId: { requestId: id, userId: access.userId } }, create: { requestId: id, userId: access.userId, assignedByUserId: access.userId }, update: {} })
  await prisma.requestActivity.create({ data: { requestId: id, authorUserId: access.userId, kind: 'SELF_ASSIGNED', message: 'Мастер взял заявку в работу' } })
  void notifyRequestAssignees(id, `Вы взяли в работу заявку «${row.type.name}».`, [access.userId])
  res.status(204).end()
})

requestsRouter.delete('/:id/assignees/self', async (req, res) => {
  await prisma.requestAssignee.deleteMany({ where: { requestId: Number(req.params.id), userId: req.auth!.userId } })
  res.status(204).end()
})

requestsRouter.post('/:id/comments', async (req, res) => {
  const id = Number(req.params.id)
  const access = await getUserAccess(req.auth!.userId)
  if (!access) return res.status(401).json({ message: 'Пользователь не найден' })
  const row = await prisma.request.findFirst({ where: { id, AND: [requestVisibilityWhere(access)] } })
  if (!row) return res.status(404).json({ message: 'Заявка не найдена' })
  const body = z.object({ body: z.string().trim().min(1).max(5000), visibility: z.nativeEnum(CommentVisibility).default(CommentVisibility.CLIENT) }).parse(req.body)
  if (access.role === Role.CLIENT && body.visibility !== CommentVisibility.CLIENT) return res.status(403).json({ message: 'Недостаточно прав' })
  const comment = await prisma.requestComment.create({ data: { requestId: id, authorUserId: access.userId, visibility: body.visibility, body: body.body }, include: { author: { select: { id: true, ipName: true, role: true } } } })
  await prisma.requestActivity.create({ data: { requestId: id, authorUserId: access.userId, kind: 'COMMENT_ADDED', message: body.visibility === CommentVisibility.INTERNAL ? 'Добавлен внутренний комментарий' : 'Добавлен комментарий для клиента' } })
  if (access.role !== Role.CLIENT && comment.visibility === CommentVisibility.CLIENT) void notifyRequestClient(id, `Новый комментарий по заявке #${id} от ${comment.author.ipName}:\n${comment.body}`)
  res.status(201).json(comment)
})
