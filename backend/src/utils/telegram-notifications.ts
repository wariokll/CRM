import { MessageDirection, TelegramIntegrationKind, TelegramIntegrationStatus, type Prisma } from '@prisma/client'
import { config } from '../config.js'
import { prisma } from '../db.js'

type TelegramSendResponse = { ok?: boolean; description?: string; result?: { message_id: number; date: number } }

/** Sends a notification only when the request is explicitly linked to a bot chat. */
export async function notifyRequestClient(requestId: number, text: string) {
  if (!config.telegramBotToken) return
  try {
    const chat = await prisma.telegramChat.findFirst({
      where: { requestId, integration: { kind: TelegramIntegrationKind.BOT, status: TelegramIntegrationStatus.ACTIVE } },
      select: { id: true, externalChatId: true, integrationId: true },
    })
    if (!chat) return
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
  } catch (error) {
    // A Telegram outage must never roll back the request update or a client comment.
    console.error('Unable to send Telegram request notification:', error)
  }
}
