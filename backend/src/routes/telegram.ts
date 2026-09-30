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
  res.json(await prisma.telegramChat.findMany({ include: { integration: true, linkedUser: { select: { id: true, ipName: true, email: true } }, organization: true, store: true, contact: true, messages: { take: 1, orderBy: { sentAt: 'desc' } } }, orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }] }))
})

telegramRouter.get('/chats/:id/messages', async (req, res) => {
  const chatId = Number(req.params.id)
  res.json(await prisma.telegramMessage.findMany({ where: { chatId }, include: { sentBy: { select: { id: true, ipName: true } } }, orderBy: { sentAt: 'asc' }, take: 500 }))
})

telegramRouter.patch('/chats/:id/link', async (req, res) => {
  const data = z.object({ linkedUserId: z.number().int().positive().nullable().optional(), organizationId: z.number().int().positive().nullable().optional(), storeId: z.number().int().positive().nullable().optional(), contactId: z.number().int().positive().nullable().optional() }).parse(req.body)
  res.json(await prisma.telegramChat.update({ where: { id: Number(req.params.id) }, data }))
})

telegramRouter.post('/chats/:id/messages', requirePermission(PermissionKey.SEND_TELEGRAM), async (req, res) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(4096) }).parse(req.body)
  void body
  const chat = await prisma.telegramChat.findUnique({ where: { id: Number(req.params.id) }, include: { integration: true } })
  if (!chat) return res.status(404).json({ message: 'Диалог не найден' })
  if (chat.integration.status !== TelegramIntegrationStatus.ACTIVE) return res.status(503).json({ message: 'Telegram ещё не подключён. Добавьте учётные данные интеграции.' })
  return res.status(501).json({ message: 'Отправка будет активирована после подключения Telegram-данных.' })
})
