import type { PrismaClient } from "@prisma/client";
import { templateFields } from "../modules/telegram/template-fields.js";
import { createBotTargetResolver } from "./bot-targets.js";
import type { Session } from "./bot-handlers.js";
import type { TelegramChatRecord } from "./bot-handler-support.js";

type ResolveTarget = ReturnType<
  typeof createBotTargetResolver
>["resolveTarget"];
type Reply = (
  chatId: number,
  externalChatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
) => Promise<void>;
type AskNextField = (
  chatId: number,
  externalChatId: string,
  session: Session,
) => Promise<void>;

export function createBotRequestSelectionHandlers(
  prisma: PrismaClient,
  sessions: Map<string, Session>,
  dependencies: {
    resolveTarget: ResolveTarget;
    reply: Reply;
    askNextField: AskNextField;
  },
) {
  const { resolveTarget, reply, askNextField } = dependencies;
  async function handleStoreSelection(chat: TelegramChatRecord, data: string) {
    const session = sessions.get(chat.externalChatId),
      storeId = Number(data.slice("request-store:".length));
    if (!session?.allowedStoreIds?.includes(storeId))
      return reply(
        chat.id,
        chat.externalChatId,
        "Выбор точки устарел. Начните создание заявки заново.",
      );
    const store = await prisma.store.findFirst({
      where: { id: storeId, status: "ACTIVE" },
      select: { id: true, organizationId: true, name: true },
    });
    if (!store)
      return reply(
        chat.id,
        chat.externalChatId,
        "Эта точка больше недоступна. Начните создание заявки заново.",
      );
    const next = {
      ...session,
      organizationId: store.organizationId,
      storeId: store.id,
      allowedStoreIds: undefined,
    };
    sessions.set(chat.externalChatId, next);
    return askNextField(chat.id, chat.externalChatId, next);
  }

  async function handleOrganizationSelection(
    chat: TelegramChatRecord,
    data: string,
  ) {
    const session = sessions.get(chat.externalChatId),
      organizationId = Number(data.slice("request-organization:".length));
    if (!session?.allowedOrganizationIds?.includes(organizationId))
      return reply(
        chat.id,
        chat.externalChatId,
        "Выбор организации устарел. Начните создание заявки заново.",
      );
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, status: "ACTIVE" },
      select: { id: true, legalName: true },
    });
    if (!organization)
      return reply(
        chat.id,
        chat.externalChatId,
        "Эта организация больше недоступна. Начните создание заявки заново.",
      );
    const next = {
      ...session,
      organizationId: organization.id,
      allowedOrganizationIds: undefined,
    };
    sessions.set(chat.externalChatId, next);
    return askNextField(chat.id, chat.externalChatId, next);
  }

  async function loadTelegramRequestType(typeId: number) {
    return prisma.requestType.findFirst({
      where: { id: typeId, isActive: true, availableOnTelegram: true },
      select: {
        id: true,
        name: true,
        requiresOrganization: true,
        requiresStore: true,
        templateFields: true,
      },
    });
  }

  type TelegramRequestType = NonNullable<
    Awaited<ReturnType<typeof loadTelegramRequestType>>
  >;
  type TelegramRequestTarget = Awaited<ReturnType<typeof resolveTarget>>;

  async function renderRequestTarget(
    chat: TelegramChatRecord,
    type: TelegramRequestType,
    target: TelegramRequestTarget,
  ) {
    if (target.kind === "missing") return reportMissingRequestTarget(chat);
    if (target.kind === "stores") return showRequestStores(chat, type, target);
    if (target.kind === "organizations")
      return showRequestOrganizations(chat, type, target);
    return beginTelegramRequest(chat, type, target);
  }

  async function reportMissingRequestTarget(chat: TelegramChatRecord) {
    return reply(
      chat.id,
      chat.externalChatId,
      "К этому Telegram-аккаунту не привязана активная организация или точка. Попросите сотрудника ЦТО настроить привязку в CRM.",
    );
  }

  async function showRequestStores(
    chat: TelegramChatRecord,
    type: TelegramRequestType,
    target: Extract<TelegramRequestTarget, { kind: "stores" }>,
  ) {
    sessions.set(chat.externalChatId, {
      typeId: type.id,
      fields: templateFields(type.templateFields),
      fieldIndex: 0,
      templateData: {},
      allowedStoreIds: target.stores.map((store) => store.id),
    });
    return reply(
      chat.id,
      chat.externalChatId,
      `Шаблон «${type.name}». Выберите торговую точку:`,
      {
        inline_keyboard: target.stores.map((store) => [
          {
            text: store.name + " — " + store.address,
            callback_data: `request-store:${store.id}`,
          },
        ]),
      },
    );
  }

  async function showRequestOrganizations(
    chat: TelegramChatRecord,
    type: TelegramRequestType,
    target: Extract<TelegramRequestTarget, { kind: "organizations" }>,
  ) {
    sessions.set(chat.externalChatId, {
      typeId: type.id,
      fields: templateFields(type.templateFields),
      fieldIndex: 0,
      templateData: {},
      allowedOrganizationIds: target.organizations.map(
        (organization) => organization.id,
      ),
    });
    return reply(
      chat.id,
      chat.externalChatId,
      `Шаблон «${type.name}». Выберите организацию:`,
      {
        inline_keyboard: target.organizations.map((organization) => [
          {
            text: organization.legalName,
            callback_data: `request-organization:${organization.id}`,
          },
        ]),
      },
    );
  }

  async function beginTelegramRequest(
    chat: TelegramChatRecord,
    type: TelegramRequestType,
    target: Extract<TelegramRequestTarget, { kind: "ready" }>,
  ) {
    const session = {
      typeId: type.id,
      organizationId: target.organizationId,
      storeId: target.storeId,
      fields: templateFields(type.templateFields),
      fieldIndex: 0,
      templateData: {},
    };
    sessions.set(chat.externalChatId, session);
    await reply(
      chat.id,
      chat.externalChatId,
      `Шаблон «${type.name}». ${session.fields?.length ? "Ответьте на дополнительные вопросы." : "Опишите проблему одним сообщением."}`,
    );
    if (session.fields?.length)
      await askNextField(chat.id, chat.externalChatId, session);
  }

  async function handleRequestSelection(
    chat: TelegramChatRecord,
    data: string,
  ) {
    if (!data.startsWith("request:")) return;
    const typeId = Number(data.slice("request:".length));
    const type = await loadTelegramRequestType(typeId);
    if (!type)
      return reply(
        chat.id,
        chat.externalChatId,
        "Этот шаблон больше недоступен. Выберите другой.",
      );
    const target = await resolveTarget(chat.id, type);
    return renderRequestTarget(chat, type, target);
  }

  return {
    handleStoreSelection,
    handleOrganizationSelection,
    handleRequestSelection,
  };
}
