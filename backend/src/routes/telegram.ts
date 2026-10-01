import { PermissionKey, TelegramIntegrationStatus } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../utils/permissions.js'

export const telegramRouter = Router()
telegramRouter.use(authenticate, requirePermission(PermissionKey.VIEW_TELEGRAM))

telegramRouter.get('/integrations', async (_req, res) => {
  res.json(await prisma.telegramIntegration.findMany({ orderBy: { kind: 'asc' } }))
})

telegramRouter.get('/chats', async (_req, res) => {
  res.json(await prisma.telegramChat.findMany({ include: { integration: true, linkedUser: { select: { id: true, ipName: true, email: true } }, organization: true, store: true, organizationLinks: { include: { organization: { select: { id: true, legalName: true } } }, orderBy: { organization: { legalName: 'asc' } } }, storeLinks: { include: { store: { select: { id: true, name: true, address: true, organizationId: true } } }, orderBy: { store: { name: 'asc' } } }, contact: true, messages: { take: 1, orderBy: { sentAt: 'desc' } } }, orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }] }))
})

telegramRouter.get('/chats/:id/messages', async (req, res) => {
  const chatId = Number(req.params.id)
  res.json(await prisma.telegramMessage.findMany({ where: { chatId }, include: { sentBy: { select: { id: true, ipName: true } } }, orderBy: { sentAt: 'asc' }, take: 500 }))
})

telegramRouter.patch('/chats/:id/link', async (req, res) => {
  const data = z.object({ linkedUserId: z.number().int().positive().nullable().optional(), organizationId: z.number().int().positive().nullable().optional(), storeId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional() }).parse(req.body)
  res.json(await prisma.telegramChat.update({ where: { id: Number(req.params.id) }, data }))
})

telegramRouter.put('/chats/:id/links', async (req, res) => {
  const chatId = Number(req.params.id)
  const data = z.object({ organizationIds: z.array(z.number().int().positive()).default([]), storeIds: z.array(z.number().int().positive()).default([]) }).parse(req.body)
  const organizationIds = [...new Set(data.organizationIds)], storeIds = [...new Set(data.storeIds)]
  const [chat, organizations, stores] = await Promise.all([
    prisma.telegramChat.findUnique({ where: { id: chatId }, select: { id: true } }),
    prisma.organization.findMany({ where: { id: { in: organizationIds } }, select: { id: true } }),
    prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true } }),
  ])
  if (!chat) return res.status(404).json({ message: 'Telegram-аккаунт не найден' })
  if (organizations.length !== organizationIds.length || stores.length !== storeIds.length) return res.status(400).json({ message: 'Одна из выбранных организаций или точек больше не существует' })
  await prisma.$transaction([
    prisma.telegramChatOrganization.deleteMany({ where: { telegramChatId: chatId } }),
    prisma.telegramChatStore.deleteMany({ where: { telegramChatId: chatId } }),
    ...(organizationIds.length ? [prisma.telegramChatOrganization.createMany({ data: organizationIds.map(organizationId => ({ telegramChatId: chatId, organizationId })) })] : []),
    ...(storeIds.length ? [prisma.telegramChatStore.createMany({ data: storeIds.map(storeId => ({ telegramChatId: chatId, storeId })) })] : []),
  ])
  res.json(await prisma.telegramChat.findUniqueOrThrow({ where: { id: chatId }, include: { organizationLinks: { include: { organization: { select: { id: true, legalName: true } } } }, storeLinks: { include: { store: { select: { id: true, name: true, address: true, organizationId: true } } } } } }))
})

telegramRouter.post('/chats/:id/messages', requirePermission(PermissionKey.SEND_TELEGRAM), async (req, res) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(4096) }).parse(req.body)
  void body
  const chat = await prisma.telegramChat.findUnique({ where: { id: Number(req.params.id) }, include: { integration: true } })
  if (!chat) return res.status(404).json({ message: 'Диалог не найден' })
  if (chat.integration.status !== TelegramIntegrationStatus.ACTIVE) return res.status(503).json({ message: 'Telegram ещё не подключён. Добавьте учётные данные интеграции.' })
  return res.status(501).json({ message: 'Отправка будет активирована после подключения Telegram-данных.' })
})
