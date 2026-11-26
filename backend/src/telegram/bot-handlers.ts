import { config } from "../config.js";
import { createBotHandlerSupport } from "./bot-handler-support.js";
import { createBotEmployeeHandlers } from "./bot-employee-handlers.js";
import { createBotRequestSelectionHandlers } from "./bot-request-selections.js";
import type { PrismaClient } from "@prisma/client";
import {
  parseFieldValue,
  type TelegramTemplateField,
} from "../modules/telegram/template-fields.js";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};
export type TelegramChat = {
  id: number;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};
export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  date: number;
};
type TelegramCallback = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};
export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallback;
};
type BotResponse<T> = { ok: boolean; result?: T; description?: string };

export type Session = {
  typeId: number;
  organizationId?: number;
  storeId?: number;
  allowedStoreIds?: number[];
  allowedOrganizationIds?: number[];
  fields?: TelegramTemplateField[];
  fieldIndex?: number;
  templateData?: Record<string, unknown>;
};
const sessions = new Map<string, Session>();

export function chatTitle(chat: TelegramChat, from?: TelegramUser) {
  return (
    chat.title ??
    ([from?.first_name ?? chat.first_name, from?.last_name ?? chat.last_name]
      .filter(Boolean)
      .join(" ") ||
      chat.username ||
      "Telegram-пользователь")
  );
}

export async function botApi<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (!config.telegramBotToken)
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const payload = (await response.json()) as BotResponse<T>;
  if (!response.ok || !payload.ok || payload.result === undefined)
    throw new Error(
      payload.description ?? `Telegram API error (${response.status})`,
    );
  return payload.result;
}

export function createBotHandlers(prisma: PrismaClient) {
  const support = createBotHandlerSupport(prisma, { botApi, chatTitle });
  const employeeHandlers = createBotEmployeeHandlers(prisma, support.reply);
  const {
    resolveTarget,
    integration,
    ensureChat,
    storeIncoming,
    reply,
    requestKeyboard,
    createRequest,
    askNextField,
  } = support;
  const { statusText, handleStaffLink, handleLinkedEmployeeMessage } =
    employeeHandlers;
  type TelegramChatRecord = Awaited<ReturnType<typeof ensureChat>>;
  async function handleTelegramCommand(
    chat: TelegramChatRecord,
    lower: string,
  ) {
    if (lower === "/start" || lower === "старт") {
      await reply(
        chat.id,
        chat.externalChatId,
        "Здравствуйте! Я бот ЦТО БАЗИС. Помогу создать заявку или показать её статус.",
        {
          keyboard: [["Создать заявку"], ["Мои заявки"]],
          resize_keyboard: true,
        },
      );
      return true;
    }
    if (lower === "создать заявку" || lower === "/new") {
      await reply(
        chat.id,
        chat.externalChatId,
        "Выберите шаблон заявки:",
        await requestKeyboard(),
      );
      return true;
    }
    if (lower === "мои заявки" || lower === "/status") {
      await reply(chat.id, chat.externalChatId, await statusText(chat.id));
      return true;
    }
    return false;
  }

  async function handleRequestSessionMessage(
    chat: TelegramChatRecord,
    session: Session,
    text: string,
  ) {
    const field = session.fields?.[session.fieldIndex ?? 0];
    if (field) {
      const parsed = parseFieldValue(field, text);
      if (!parsed.ok) {
        await reply(chat.id, chat.externalChatId, parsed.message);
        return;
      }
      const templateData = {
        ...(session.templateData ?? {}),
        ...(parsed.value !== undefined && { [field.key]: parsed.value }),
      };
      const next = {
        ...session,
        templateData,
        fieldIndex: (session.fieldIndex ?? 0) + 1,
      };
      sessions.set(chat.externalChatId, next);
      await askNextField(chat.id, chat.externalChatId, next);
      return;
    }
    sessions.delete(chat.externalChatId);
    const request = await createRequest(chat.id, session, text);
    if (request) {
      await reply(
        chat.id,
        chat.externalChatId,
        "Заявка принята. Мы сообщим о дальнейшем статусе.",
      );
      return;
    }
    const link = config.telegramRegistrationUrl
      ? `\nЗарегистрируйтесь: ${config.telegramRegistrationUrl}`
      : "";
    await reply(
      chat.id,
      chat.externalChatId,
      `Для этого шаблона нужны подтверждённые организация и торговая точка.${link}\nПосле регистрации сотрудник свяжет этот Telegram-диалог с вашей организацией.`,
    );
  }

  async function handleMessage(
    integrationId: number,
    message: TelegramMessage,
  ) {
    const chat = await ensureChat(integrationId, message);
    await storeIncoming(chat.id, message);
    const text = message.text?.trim() ?? "";
    const lower = text.toLowerCase();
    const startArgument = /^\/start(?:\s+(.+))?$/i.exec(text)?.[1];
    if (await handleStaffLink(chat, startArgument)) return;
    if (await handleLinkedEmployeeMessage(chat)) return;
    if (await handleTelegramCommand(chat, lower)) return;
    const session = sessions.get(chat.externalChatId);
    if (session) return handleRequestSessionMessage(chat, session, text);
    return reply(
      chat.id,
      chat.externalChatId,
      "Выберите действие в меню или отправьте /start.",
    );
  }

  const requestSelectionHandlers = createBotRequestSelectionHandlers(
    prisma,
    sessions,
    { resolveTarget, reply, askNextField },
  );
  const {
    handleStoreSelection,
    handleOrganizationSelection,
    handleRequestSelection,
  } = requestSelectionHandlers;
  async function handleCallback(
    integrationId: number,
    callback: TelegramCallback,
  ) {
    const message = callback.message;
    if (!message || !callback.data) return;
    const chat = await ensureChat(integrationId, message);
    await botApi<boolean>("answerCallbackQuery", {
      callback_query_id: callback.id,
    });
    if (callback.data.startsWith("request-store:"))
      return handleStoreSelection(chat, callback.data);
    if (callback.data.startsWith("request-organization:"))
      return handleOrganizationSelection(chat, callback.data);
    return handleRequestSelection(chat, callback.data);
  }

  async function processUpdate(integrationId: number, update: TelegramUpdate) {
    if (update.message) await handleMessage(integrationId, update.message);
    if (update.callback_query)
      await handleCallback(integrationId, update.callback_query);
  }

  return { integration, processUpdate };
}
