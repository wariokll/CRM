import { Priority, RequestSource, Role, TelegramIntegrationKind, TelegramIntegrationStatus, Urgency, type Prisma } from '@prisma/client'
import { config } from '../config.js'
import { prisma } from '../db.js'

type TelegramUser = { id: number; first_name: string; last_name?: string; username?: string }
type TelegramChat = { id: number; title?: string; username?: string; first_name?: string; last_name?: string }
type TelegramMessage = { message_id: number; chat: TelegramChat; from?: TelegramUser; text?: string; date: number }
type TelegramCallback = { id: string; from: TelegramUser; message?: TelegramMessage; data?: string }
type TelegramUpdate = { update_id: number; message?: TelegramMessage; callback_query?: TelegramCallback }
type BotResponse<T> = { ok: boolean; result?: T; description?: string }

type Session = { typeId: number }
const sessions = new Map<string, Session>()
let stopped = false

function chatTitle(chat: TelegramChat, from?: TelegramUser) {
  return chat.title ?? ([from?.first_name ?? chat.first_name, from?.last_name ?? chat.last_name].filter(Boolean).join(' ') || chat.username || 'Telegram-пользователь')
}

async function botApi<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  if (!config.telegramBotToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json() as BotResponse<T>
  if (!response.ok || !payload.ok || payload.result === undefined) throw new Error(payload.description ?? `Telegram API error (${response.status})`)
  return payload.result
}

async function integration() {
  return prisma.telegramIntegration.upsert({
    where: { kind: TelegramIntegrationKind.BOT },
    create: { kind: TelegramIntegrationKind.BOT, status: TelegramIntegrationStatus.CONNECTING, displayName: `@${config.telegramBotUsername}` },
    update: { status: TelegramIntegrationStatus.CONNECTING, lastError: null, displayName: `@${config.telegramBotUsername}` },
  })
}

async function ensureChat(integrationId: number, message: TelegramMessage) {
  const externalChatId = String(message.chat.id)
  const title = chatTitle(message.chat, message.from)
  const existing = await prisma.telegramChat.findUnique({ where: { integrationId_externalChatId: { integrationId, externalChatId } } })
  if (existing) {
    return prisma.telegramChat.update({ where: { id: existing.id }, data: { title, username: message.from?.username ?? message.chat.username, unreadCount: { increment: 1 }, lastMessageAt: new Date(message.date * 1000) } })
  }
  const contact = await prisma.contact.create({ data: { displayName: title } })
  return prisma.telegramChat.create({ data: { integrationId, externalChatId, title, username: message.from?.username ?? message.chat.username, contactId: contact.id, unreadCount: 1, lastMessageAt: new Date(message.date * 1000) } })
}

async function storeIncoming(chatId: number, message: TelegramMessage) {
  await prisma.telegramMessage.upsert({
    where: { chatId_externalMessageId: { chatId, externalMessageId: String(message.message_id) } },
    create: { chatId, externalMessageId: String(message.message_id), direction: 'INCOMING', body: message.text, payload: message as unknown as Prisma.InputJsonValue, sentAt: new Date(message.date * 1000) },
    update: {},
  })
}

async function reply(chatId: number, externalChatId: string, text: string, replyMarkup?: Record<string, unknown>) {
  const result = await botApi<TelegramMessage>('sendMessage', { chat_id: externalChatId, text, ...(replyMarkup && { reply_markup: replyMarkup }) })
  await prisma.telegramMessage.upsert({
    where: { chatId_externalMessageId: { chatId, externalMessageId: String(result.message_id) } },
    create: { chatId, externalMessageId: String(result.message_id), direction: 'OUTGOING', body: text, payload: result as unknown as Prisma.InputJsonValue, sentAt: new Date(result.date * 1000) },
    update: {},
  })
  await prisma.telegramChat.update({ where: { id: chatId }, data: { lastMessageAt: new Date(result.date * 1000) } })
}

async function requestKeyboard() {
  const types = await prisma.requestType.findMany({ where: { isActive: true, availableOnTelegram: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } })
  return { inline_keyboard: types.map(type => [{ text: type.name, callback_data: `request:${type.id}` }]) }
}

async function createRequest(chatId: number, session: Session, description: string) {
  const chat = await prisma.telegramChat.findUnique({ where: { id: chatId }, include: { linkedUser: true, organization: true, store: true, contact: true } })
  const type = await prisma.requestType.findUnique({ where: { id: session.typeId } })
  const director = await prisma.user.findFirst({ where: { role: Role.DIRECTOR, status: 'ACTIVE' }, select: { id: true } })
  if (!chat || !type || !director) throw new Error('Не удалось подготовить заявку')
  let organizationId = chat.organizationId
  if (!organizationId && chat.linkedUserId) {
    const organization = await prisma.organization.findFirst({ where: { status: 'ACTIVE', members: { some: { userId: chat.linkedUserId } } }, orderBy: { createdAt: 'asc' }, select: { id: true } })
    organizationId = organization?.id ?? null
  }
  let storeId = chat.storeId
  if (!storeId && organizationId) {
    const store = await prisma.store.findFirst({ where: { organizationId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' }, select: { id: true } })
    storeId = store?.id ?? null
  }
  if ((type.requiresOrganization && !organizationId) || (type.requiresStore && !storeId)) return null
  return prisma.$transaction(async transaction => {
    const request = await transaction.request.create({ data: { storeId, organizationId, createdByUserId: chat.linkedUserId, contactId: chat.contactId, typeId: type.id, departmentId: type.departmentId, urgency: Urgency.URGENT, priority: type.defaultPriority ?? Priority.NORMAL, source: RequestSource.TELEGRAM_BOT, description } })
    await transaction.requestDepartmentHistory.create({ data: { requestId: request.id, toDepartmentId: type.departmentId, transferredByUserId: director.id } })
    await transaction.telegramChat.update({ where: { id: chat.id }, data: { requestId: request.id, unreadCount: 0 } })
    return request
  })
}

async function statusText(chatId: number) {
  const chat = await prisma.telegramChat.findUnique({ where: { id: chatId }, select: { linkedUserId: true, organizationId: true, contactId: true } })
  if (!chat) return 'Не удалось найти диалог.'
  const requests = await prisma.request.findMany({ where: { OR: [{ contactId: chat.contactId }, ...(chat.linkedUserId ? [{ createdByUserId: chat.linkedUserId }] : []), ...(chat.organizationId ? [{ organizationId: chat.organizationId }] : [])] }, orderBy: { createdAt: 'desc' }, take: 5, include: { type: true } })
  if (!requests.length) return 'У вас пока нет заявок.'
  const labels: Record<string, string> = { NEW: 'новая', ACCEPTED: 'принята', IN_PROGRESS: 'в работе', DONE: 'выполнена', CANCELLED: 'отменена' }
  return `Последние заявки:\n${requests.map(row => `#${row.id} · ${row.type.name} · ${labels[row.status]}`).join('\n')}`
}

async function handleMessage(integrationId: number, message: TelegramMessage) {
  const chat = await ensureChat(integrationId, message)
  await storeIncoming(chat.id, message)
  const text = message.text?.trim() ?? ''
  const lower = text.toLowerCase()
  if (lower === '/start' || lower === 'старт') return reply(chat.id, chat.externalChatId, 'Здравствуйте! Я бот ЦТО БАЗИС. Помогу создать заявку или показать её статус.', { keyboard: [['Создать заявку'], ['Мои заявки']], resize_keyboard: true })
  if (lower === 'создать заявку' || lower === '/new') return reply(chat.id, chat.externalChatId, 'Выберите шаблон заявки:', await requestKeyboard())
  if (lower === 'мои заявки' || lower === '/status') return reply(chat.id, chat.externalChatId, await statusText(chat.id))
  const session = sessions.get(chat.externalChatId)
  if (session) {
    sessions.delete(chat.externalChatId)
    const request = await createRequest(chat.id, session, text)
    if (request) return reply(chat.id, chat.externalChatId, 'Заявка принята. Мы сообщим о дальнейшем статусе.')
    const link = config.telegramRegistrationUrl ? `\nЗарегистрируйтесь: ${config.telegramRegistrationUrl}` : ''
    return reply(chat.id, chat.externalChatId, `Для этого шаблона нужны подтверждённые организация и торговая точка.${link}\nПосле регистрации сотрудник свяжет этот Telegram-диалог с вашей организацией.`)
  }
  return reply(chat.id, chat.externalChatId, 'Выберите действие в меню или отправьте /start.')
}

async function handleCallback(integrationId: number, callback: TelegramCallback) {
  const message = callback.message
  if (!message || !callback.data?.startsWith('request:')) return
  const chat = await ensureChat(integrationId, message)
  const typeId = Number(callback.data.slice('request:'.length))
  const type = await prisma.requestType.findFirst({ where: { id: typeId, isActive: true, availableOnTelegram: true }, select: { id: true, name: true } })
  await botApi<boolean>('answerCallbackQuery', { callback_query_id: callback.id })
  if (!type) return reply(chat.id, chat.externalChatId, 'Этот шаблон больше недоступен. Выберите другой.')
  sessions.set(chat.externalChatId, { typeId: type.id })
  await reply(chat.id, chat.externalChatId, `Шаблон «${type.name}». Опишите проблему одним сообщением.`)
}

async function processUpdate(integrationId: number, update: TelegramUpdate) {
  if (update.message) await handleMessage(integrationId, update.message)
  if (update.callback_query) await handleCallback(integrationId, update.callback_query)
}

async function main() {
  if (!config.telegramBotToken) { console.log('Telegram bot is disabled: TELEGRAM_BOT_TOKEN is not set'); return }
  const item = await integration()
  try {
    const me = await botApi<{ username?: string }>('getMe')
    await prisma.telegramIntegration.update({ where: { id: item.id }, data: { status: TelegramIntegrationStatus.ACTIVE, displayName: me.username ? `@${me.username}` : `@${config.telegramBotUsername}`, lastConnectedAt: new Date(), lastError: null } })
    await botApi<boolean>('setMyCommands', { commands: [{ command: 'start', description: 'Главное меню' }, { command: 'new', description: 'Создать заявку' }, { command: 'status', description: 'Мои заявки' }] })
    console.log(`Telegram bot @${me.username ?? config.telegramBotUsername} is polling for updates`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Telegram configuration error'
    await prisma.telegramIntegration.update({ where: { id: item.id }, data: { status: TelegramIntegrationStatus.ERROR, lastError: message } })
    throw error
  }
  let offset = 0
  while (!stopped) {
    try {
      const updates = await botApi<TelegramUpdate[]>('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] })
      for (const update of updates) { offset = update.update_id + 1; await processUpdate(item.id, update) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Telegram polling error'
      await prisma.telegramIntegration.update({ where: { id: item.id }, data: { status: TelegramIntegrationStatus.ERROR, lastError: message } })
      console.error(message)
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
}

process.on('SIGINT', () => { stopped = true })
process.on('SIGTERM', () => { stopped = true })
main().finally(() => prisma.$disconnect())
