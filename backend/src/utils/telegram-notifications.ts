import { MessageDirection, TelegramIntegrationKind, TelegramIntegrationStatus, type Prisma } from '@prisma/client'
import { config } from '../config.js'
import { prisma } from '../db.js'

type TelegramSendResponse = { ok?: boolean; description?: string; result?: { message_id: number; date: number } }
type NotificationChat = { id: number; externalChatId: string; integrationId: number }

async function sendToChat(chat: NotificationChat, text: string) {
  if (!config.telegramBotToken) return false
  try {
    const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat.externalChatId, text }),
    })
    const payload = await response.json() as TelegramSendResponse
    if (!response.ok || !payload.ok || !payload.result) throw new Error(payload.description ?? `Telegram API error (${response.status})`)
    const sentAt = new Date(payload.result.date * 1000)
    await prisma.$transaction([
      prisma.telegramMessage.upsert({
        where: { chatId_externalMessageId: { chatId: chat.id, externalMessageId: String(payload.result.message_id) } },
        create: { chatId: chat.id, externalMessageId: String(payload.result.message_id), direction: MessageDirection.OUTGOING, body: text, payload: payload as Prisma.InputJsonValue, sentAt },
        update: {},
      }),
      prisma.telegramChat.update({ where: { id: chat.id }, data: { lastMessageAt: sentAt } }),
      prisma.telegramIntegration.update({ where: { id: chat.integrationId }, data: { lastError: null } }),
    ])
    return true
  } catch (error) {
    // A Telegram outage must never roll back a CRM action.
    console.error('Unable to send Telegram request notification:', error)
    return false
  }
}

/** Sends a client notification only when this request is explicitly linked to a bot chat. */
export async function notifyRequestClient(requestId: number, text: string) {
  const chat = await prisma.telegramChat.findFirst({
    where: { requestId, integration: { kind: TelegramIntegrationKind.BOT, status: TelegramIntegrationStatus.ACTIVE } },
    select: { id: true, externalChatId: true, integrationId: true },
  })
  return chat ? sendToChat(chat, text) : false
}

/** Sends a work notification to one linked bot chat per assigned staff member. */
export async function notifyRequestAssignees(requestId: number, text: string, onlyUserIds?: number[]) {
  const request = await prisma.request.findUnique({ where: { id: requestId }, select: { assignees: { select: { userId: true } } } })
  const ids = (onlyUserIds ?? request?.assignees.map(item => item.userId) ?? []).filter((id, index, source) => source.indexOf(id) === index)
  if (!ids.length) return 0
  const chats = await prisma.telegramChat.findMany({
    where: { linkedUserId: { in: ids }, integration: { kind: TelegramIntegrationKind.BOT, status: TelegramIntegrationStatus.ACTIVE } },
    select: { id: true, externalChatId: true, integrationId: true, linkedUserId: true }, orderBy: { updatedAt: 'desc' },
  })
  const byUser = new Map<number, NotificationChat>()
  for (const chat of chats) if (chat.linkedUserId && !byUser.has(chat.linkedUserId)) byUser.set(chat.linkedUserId, chat)
  const sent = await Promise.all([...byUser.values()].map(chat => sendToChat(chat, text)))
  return sent.filter(Boolean).length
}
