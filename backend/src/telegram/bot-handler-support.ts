import {
  Priority,
  RequestSource,
  Role,
  TelegramIntegrationKind,
  TelegramIntegrationStatus,
  Urgency,
  type Prisma,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { config } from "../config.js";
import { createBotTargetResolver } from "./bot-targets.js";
import { fieldPrompt } from "../modules/telegram/template-fields.js";
import type { TelegramMessage, Session } from "./bot-handlers.js";
import type { botApi, chatTitle } from "./bot-handlers.js";

export type TelegramChatRecord =
  Prisma.TelegramChatGetPayload<Prisma.TelegramChatDefaultArgs>;

export function createBotHandlerSupport(
  prisma: PrismaClient,
  helpers: { botApi: typeof botApi; chatTitle: typeof chatTitle },
) {
  const { botApi, chatTitle } = helpers;
  async function integration() {
    return prisma.telegramIntegration.upsert({
      where: { kind: TelegramIntegrationKind.BOT },
      create: {
        kind: TelegramIntegrationKind.BOT,
        status: TelegramIntegrationStatus.CONNECTING,
        displayName: `@${config.telegramBotUsername}`,
      },
      update: {
        status: TelegramIntegrationStatus.CONNECTING,
        lastError: null,
        displayName: `@${config.telegramBotUsername}`,
      },
    });
  }

  async function ensureChat(integrationId: number, message: TelegramMessage) {
    const externalChatId = String(message.chat.id);
    const title = chatTitle(message.chat, message.from);
    const existing = await prisma.telegramChat.findUnique({
      where: {
        integrationId_externalChatId: { integrationId, externalChatId },
      },
    });
    if (existing) {
      return prisma.telegramChat.update({
        where: { id: existing.id },
        data: {
          title,
          username: message.from?.username ?? message.chat.username,
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(message.date * 1000),
        },
      });
    }
    const contact = await prisma.contact.create({
      data: { displayName: title },
    });
    return prisma.telegramChat.create({
      data: {
        integrationId,
        externalChatId,
        title,
        username: message.from?.username ?? message.chat.username,
        contactId: contact.id,
        unreadCount: 1,
        lastMessageAt: new Date(message.date * 1000),
      },
    });
  }

  async function storeIncoming(chatId: number, message: TelegramMessage) {
    await prisma.telegramMessage.upsert({
      where: {
        chatId_externalMessageId: {
          chatId,
          externalMessageId: String(message.message_id),
        },
      },
      create: {
        chatId,
        externalMessageId: String(message.message_id),
        direction: "INCOMING",
        body: message.text,
        payload: message as unknown as Prisma.InputJsonValue,
        sentAt: new Date(message.date * 1000),
      },
      update: {},
    });
  }

  async function reply(
    chatId: number,
    externalChatId: string,
    text: string,
    replyMarkup?: Record<string, unknown>,
  ) {
    const result = await botApi<TelegramMessage>("sendMessage", {
      chat_id: externalChatId,
      text,
      ...(replyMarkup && { reply_markup: replyMarkup }),
    });
    await prisma.telegramMessage.upsert({
      where: {
        chatId_externalMessageId: {
          chatId,
          externalMessageId: String(result.message_id),
        },
      },
      create: {
        chatId,
        externalMessageId: String(result.message_id),
        direction: "OUTGOING",
        body: text,
        payload: result as unknown as Prisma.InputJsonValue,
        sentAt: new Date(result.date * 1000),
      },
      update: {},
    });
    await prisma.telegramChat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date(result.date * 1000) },
    });
  }

  async function requestKeyboard() {
    const types = await prisma.requestType.findMany({
      where: { isActive: true, availableOnTelegram: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return {
      inline_keyboard: types.map((type) => [
        { text: type.name, callback_data: `request:${type.id}` },
      ]),
    };
  }

  const { resolveTarget } = createBotTargetResolver(prisma);

  async function prepareTelegramRequest(chatId: number, session: Session) {
    const chat = await prisma.telegramChat.findUnique({
      where: { id: chatId },
      include: { contact: true },
    });
    const type = await prisma.requestType.findUnique({
      where: { id: session.typeId },
    });
    const director = await prisma.user.findFirst({
      where: { role: Role.DIRECTOR, status: "ACTIVE" },
      select: { id: true },
    });
    if (!chat || !type || !director)
      throw new Error("Не удалось подготовить заявку");
    return { chat, type, director };
  }

  async function persistTelegramRequest(
    session: Session,
    description: string,
    context: Awaited<ReturnType<typeof prepareTelegramRequest>>,
  ) {
    const { chat, type, director } = context;
    const organizationId = session.organizationId ?? null,
      storeId = session.storeId ?? null;
    return prisma.$transaction(async (transaction) => {
      const request = await transaction.request.create({
        data: {
          storeId,
          organizationId,
          createdByUserId: chat.linkedUserId,
          contactId: chat.contactId,
          typeId: type.id,
          departmentId: type.departmentId,
          urgency: Urgency.URGENT,
          priority: type.defaultPriority ?? Priority.NORMAL,
          source: RequestSource.TELEGRAM_BOT,
          description,
          templateData: session.templateData as
            Prisma.InputJsonValue | undefined,
        },
      });
      await transaction.requestDepartmentHistory.create({
        data: {
          requestId: request.id,
          toDepartmentId: type.departmentId,
          transferredByUserId: director.id,
        },
      });
      await transaction.telegramChat.update({
        where: { id: chat.id },
        data: { requestId: request.id, unreadCount: 0 },
      });
      return request;
    });
  }

  async function createRequest(
    chatId: number,
    session: Session,
    description: string,
  ) {
    const context = await prepareTelegramRequest(chatId, session);
    const { type } = context;
    if (
      (type.requiresOrganization && !session.organizationId) ||
      (type.requiresStore && !session.storeId)
    )
      return null;
    return persistTelegramRequest(session, description, context);
  }

  async function askNextField(
    chatId: number,
    externalChatId: string,
    session: Session,
  ) {
    const field = session.fields?.[session.fieldIndex ?? 0];
    return reply(
      chatId,
      externalChatId,
      field ? fieldPrompt(field) : "Опишите проблему одним сообщением.",
    );
  }

  return {
    resolveTarget,
    integration,
    ensureChat,
    storeIncoming,
    reply,
    requestKeyboard,
    createRequest,
    askNextField,
  };
}
