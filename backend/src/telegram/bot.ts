import { Priority, RequestSource, Role, TelegramIntegrationKind, TelegramIntegrationStatus, Urgency, UserStatus, type Prisma } from '@prisma/client'
import { config } from '../config.js'
import { prisma } from '../db.js'

type TelegramUser = { id: number; first_name: string; last_name?: string; username?: string }
type TelegramChat = { id: number; title?: string; username?: string; first_name?: string; last_name?: string }
type TelegramMessage = { message_id: number; chat: TelegramChat; from?: TelegramUser; text?: string; date: number }
type TelegramCallback = { id: string; from: TelegramUser; message?: TelegramMessage; data?: string }
type TelegramUpdate = { update_id: number; message?: TelegramMessage; callback_query?: TelegramCallback }
type BotResponse<T> = { ok: boolean; result?: T; description?: string }

type Session = { typeId: number; organizationId?: number; storeId?: number; allowedStoreIds?: number[]; allowedOrganizationIds?: number[] }
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

async function resolveTarget(chatId: number, type: { requiresOrganization: boolean; requiresStore: boolean }) {
  const chat = await prisma.telegramChat.findUnique({ where: { id: chatId }, include: { organizationLinks: { include: { organization: { select: { id: true, legalName: true, status: true } } } }, storeLinks: { include: { store: { select: { id: true, name: true, address: true, organizationId: true, status: true } } } } } })
  if (!chat) return { kind: 'missing' as const }
  const organizationMap = new Map(chat.organizationLinks.filter(link => link.organization.status === 'ACTIVE').map(link => [link.organization.id, link.organization]))
  if (chat.organizationId) { const organization = await prisma.organization.findUnique({ where: { id: chat.organizationId }, select: { id: true, legalName: true, status: true } }); if (organization?.status === 'ACTIVE') organizationMap.set(organization.id, organization) }
  if (!organizationMap.size && chat.linkedUserId) {
    const organizations = await prisma.organization.findMany({ where: { status: 'ACTIVE', members: { some: { userId: chat.linkedUserId } } }, select: { id: true, legalName: true, status: true } })
    organizations.forEach(organization => organizationMap.set(organization.id, organization))
  }
  const linkedStores = chat.storeLinks.map(link => link.store).filter(store => store.status === 'ACTIVE')
  if (chat.storeId) { const store = await prisma.store.findUnique({ where: { id: chat.storeId }, select: { id: true, name: true, address: true, organizationId: true, status: true } }); if (store?.status === 'ACTIVE' && !linkedStores.some(item => item.id === store.id)) linkedStores.push(store) }
  linkedStores.forEach(store => { if (!organizationMap.has(store.organizationId)) organizationMap.set(store.organizationId, { id: store.organizationId, legalName: 'Организация точки', status: 'ACTIVE' }) })
  const organizations = [...organizationMap.values()]
  if (!type.requiresOrganization && !type.requiresStore) return { kind: 'ready' as const }
  if (type.requiresStore) {
    const stores = linkedStores.length ? linkedStores : await prisma.store.findMany({ where: { organizationId: { in: organizations.map(organization => organization.id) }, status: 'ACTIVE' }, select: { id: true, name: true, address: true, organizationId: true, status: true }, orderBy: { name: 'asc' } })
    if (!stores.length) return { kind: 'missing' as const }
    if (stores.length === 1) return { kind: 'ready' as const, organizationId: stores[0].organizationId, storeId: stores[0].id }
    return { kind: 'stores' as const, stores }
  }
  if (organizations.length === 1) return { kind: 'ready' as const, organizationId: organizations[0].id }
  if (organizations.length > 1) return { kind: 'organizations' as const, organizations }
  return { kind: 'missing' as const }
}

async function createRequest(chatId: number, session: Session, description: string) {
  const chat = await prisma.telegramChat.findUnique({ where: { id: chatId }, include: { contact: true } })
  const type = await prisma.requestType.findUnique({ where: { id: session.typeId } })
  const director = await prisma.user.findFirst({ where: { role: Role.DIRECTOR, status: 'ACTIVE' }, select: { id: true } })
  if (!chat || !type || !director) throw new Error('Не удалось подготовить заявку')
  const organizationId = session.organizationId ?? null, storeId = session.storeId ?? null
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

async function linkEmployeeChat(chatId: number, code: string) {
  const link = await prisma.telegramLinkCode.findUnique({ where: { code }, include: { user: { select: { id: true, ipName: true, role: true, status: true } } } })
  if (!link || link.usedAt || link.expiresAt <= new Date() || link.user.status !== UserStatus.ACTIVE || link.user.role === Role.CLIENT) return null
  await prisma.$transaction([
    prisma.telegramChat.update({ where: { id: chatId }, data: { linkedUserId: link.userId, unreadCount: 0 } }),
    prisma.telegramLinkCode.update({ where: { id: link.id }, data: { usedAt: new Date() } }),
  ])
  return link.user
}

async function handleMessage(integrationId: number, message: TelegramMessage) {
  const chat = await ensureChat(integrationId, message)
  await storeIncoming(chat.id, message)
  const text = message.text?.trim() ?? ''
  const lower = text.toLowerCase()
  const startArgument = /^\/start(?:\s+(.+))?$/i.exec(text)?.[1]
  if (startArgument?.startsWith('staff_')) {
    const employee = await linkEmployeeChat(chat.id, startArgument.slice('staff_'.length))
    return reply(chat.id, chat.externalChatId, employee ? `Telegram подключён к учётной записи «${employee.ipName}». Теперь вы будете получать рабочие уведомления по заявкам.` : 'Ссылка недействительна или устарела. Попросите руководителя сформировать новую ссылку.')
  }
  if (chat.linkedUserId) {
    const employee = await prisma.user.findUnique({ where: { id: chat.linkedUserId }, select: { role: true, status: true } })
    if (employee && employee.status === UserStatus.ACTIVE && employee.role !== Role.CLIENT) return reply(chat.id, chat.externalChatId, 'Рабочий Telegram подключён. Здесь будут приходить уведомления о назначенных заявках и напоминаниях.')
  }
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
  if (!message || !callback.data) return
  const chat = await ensureChat(integrationId, message)
  await botApi<boolean>('answerCallbackQuery', { callback_query_id: callback.id })
  if (callback.data.startsWith('request-store:')) {
    const session = sessions.get(chat.externalChatId), storeId = Number(callback.data.slice('request-store:'.length))
    if (!session?.allowedStoreIds?.includes(storeId)) return reply(chat.id, chat.externalChatId, 'Выбор точки устарел. Начните создание заявки заново.')
    const store = await prisma.store.findFirst({ where: { id: storeId, status: 'ACTIVE' }, select: { id: true, organizationId: true, name: true } })
    if (!store) return reply(chat.id, chat.externalChatId, 'Эта точка больше недоступна. Начните создание заявки заново.')
    sessions.set(chat.externalChatId, { typeId: session.typeId, organizationId: store.organizationId, storeId: store.id })
    return reply(chat.id, chat.externalChatId, `Точка «${store.name}» выбрана. Опишите проблему одним сообщением.`)
  }
  if (callback.data.startsWith('request-organization:')) {
    const session = sessions.get(chat.externalChatId), organizationId = Number(callback.data.slice('request-organization:'.length))
    if (!session?.allowedOrganizationIds?.includes(organizationId)) return reply(chat.id, chat.externalChatId, 'Выбор организации устарел. Начните создание заявки заново.')
    const organization = await prisma.organization.findFirst({ where: { id: organizationId, status: 'ACTIVE' }, select: { id: true, legalName: true } })
    if (!organization) return reply(chat.id, chat.externalChatId, 'Эта организация больше недоступна. Начните создание заявки заново.')
    sessions.set(chat.externalChatId, { typeId: session.typeId, organizationId: organization.id })
    return reply(chat.id, chat.externalChatId, `Организация «${organization.legalName}» выбрана. Опишите проблему одним сообщением.`)
  }
  if (!callback.data.startsWith('request:')) return
  const typeId = Number(callback.data.slice('request:'.length))
  const type = await prisma.requestType.findFirst({ where: { id: typeId, isActive: true, availableOnTelegram: true }, select: { id: true, name: true, requiresOrganization: true, requiresStore: true } })
  if (!type) return reply(chat.id, chat.externalChatId, 'Этот шаблон больше недоступен. Выберите другой.')
  const target = await resolveTarget(chat.id, type)
  if (target.kind === 'missing') return reply(chat.id, chat.externalChatId, 'К этому Telegram-аккаунту не привязана активная организация или точка. Попросите сотрудника ЦТО настроить привязку в CRM.')
  if (target.kind === 'stores') {
    sessions.set(chat.externalChatId, { typeId: type.id, allowedStoreIds: target.stores.map(store => store.id) })
    return reply(chat.id, chat.externalChatId, `Шаблон «${type.name}». Выберите торговую точку:`, { inline_keyboard: target.stores.map(store => [{ text: store.name + ' — ' + store.address, callback_data: `request-store:${store.id}` }]) })
  }
  if (target.kind === 'organizations') {
    sessions.set(chat.externalChatId, { typeId: type.id, allowedOrganizationIds: target.organizations.map(organization => organization.id) })
    return reply(chat.id, chat.externalChatId, `Шаблон «${type.name}». Выберите организацию:`, { inline_keyboard: target.organizations.map(organization => [{ text: organization.legalName, callback_data: `request-organization:${organization.id}` }]) })
  }
  sessions.set(chat.externalChatId, { typeId: type.id, organizationId: target.organizationId, storeId: target.storeId })
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
