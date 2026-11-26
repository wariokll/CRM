import { TelegramIntegrationStatus } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import type { PrismaClient } from "@prisma/client";
import type {
  ReplaceTelegramLinksInput,
  SendTelegramMessageInput,
  UpdateTelegramChatInput,
} from "./telegram.schemas.js";
import {
  telegramChatInclude,
  telegramChatLinksInclude,
} from "./telegram.mapper.js";

export const telegramMessages = {
  chatNotFound: "Telegram-аккаунт не найден",
  linksNotFound: "Одна из выбранных организаций или точек больше не существует",
  dialogNotFound: "Диалог не найден",
  notConnected:
    "Telegram ещё не подключён. Добавьте учётные данные интеграции.",
  sendingDisabled:
    "Отправка будет активирована после подключения Telegram-данных.",
};

export function createTelegramService(prisma: PrismaClient) {
  function listIntegrations() {
    return prisma.telegramIntegration.findMany({ orderBy: { kind: "asc" } });
  }

  function listChats() {
    return prisma.telegramChat.findMany({
      include: telegramChatInclude,
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    });
  }

  function listChatMessages(chatId: number) {
    return prisma.telegramMessage.findMany({
      where: { chatId },
      include: { sentBy: { select: { id: true, ipName: true } } },
      orderBy: { sentAt: "asc" },
      take: 500,
    });
  }

  function updateTelegramChat(chatId: number, data: UpdateTelegramChatInput) {
    return prisma.telegramChat.update({ where: { id: chatId }, data });
  }

  async function replaceTelegramChatLinks(
    chatId: number,
    data: ReplaceTelegramLinksInput,
  ) {
    const organizationIds = [...new Set(data.organizationIds)];
    const storeIds = [...new Set(data.storeIds)];
    const [chat, organizations, stores] = await Promise.all([
      prisma.telegramChat.findUnique({
        where: { id: chatId },
        select: { id: true },
      }),
      prisma.organization.findMany({
        where: { id: { in: organizationIds } },
        select: { id: true },
      }),
      prisma.store.findMany({
        where: { id: { in: storeIds } },
        select: { id: true },
      }),
    ]);
    if (!chat) throw new AppError(telegramMessages.chatNotFound, 404);
    if (
      organizations.length !== organizationIds.length ||
      stores.length !== storeIds.length
    )
      throw new AppError(telegramMessages.linksNotFound, 400);

    await prisma.$transaction([
      prisma.telegramChatOrganization.deleteMany({
        where: { telegramChatId: chatId },
      }),
      prisma.telegramChatStore.deleteMany({
        where: { telegramChatId: chatId },
      }),
      ...(organizationIds.length
        ? [
            prisma.telegramChatOrganization.createMany({
              data: organizationIds.map((organizationId) => ({
                telegramChatId: chatId,
                organizationId,
              })),
            }),
          ]
        : []),
      ...(storeIds.length
        ? [
            prisma.telegramChatStore.createMany({
              data: storeIds.map((storeId) => ({
                telegramChatId: chatId,
                storeId,
              })),
            }),
          ]
        : []),
    ]);
    return prisma.telegramChat.findUniqueOrThrow({
      where: { id: chatId },
      include: telegramChatLinksInclude,
    });
  }

  async function sendTelegramMessage(
    chatId: number,
    { body }: SendTelegramMessageInput,
  ) {
    void body;
    const chat = await prisma.telegramChat.findUnique({
      where: { id: chatId },
      include: { integration: true },
    });
    if (!chat) throw new AppError(telegramMessages.dialogNotFound, 404);
    if (chat.integration.status !== TelegramIntegrationStatus.ACTIVE)
      throw new AppError(telegramMessages.notConnected, 503);
    throw new AppError(telegramMessages.sendingDisabled, 501);
  }

  return {
    listIntegrations,
    listChats,
    listChatMessages,
    updateTelegramChat,
    replaceTelegramChatLinks,
    sendTelegramMessage,
  };
}
