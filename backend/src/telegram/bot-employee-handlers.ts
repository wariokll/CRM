import { Role, UserStatus, type PrismaClient } from "@prisma/client";
import type { TelegramChatRecord } from "./bot-handler-support.js";

type Reply = (
  chatId: number,
  externalChatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
) => Promise<void>;

export function createBotEmployeeHandlers(prisma: PrismaClient, reply: Reply) {
  async function statusText(chatId: number) {
    const chat = await prisma.telegramChat.findUnique({
      where: { id: chatId },
      select: { linkedUserId: true, organizationId: true, contactId: true },
    });
    if (!chat) return "Не удалось найти диалог.";
    const requests = await prisma.request.findMany({
      where: {
        OR: [
          { contactId: chat.contactId },
          ...(chat.linkedUserId
            ? [{ createdByUserId: chat.linkedUserId }]
            : []),
          ...(chat.organizationId
            ? [{ organizationId: chat.organizationId }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { type: true },
    });
    if (!requests.length) return "У вас пока нет заявок.";
    const labels: Record<string, string> = {
      NEW: "новая",
      ACCEPTED: "принята",
      IN_PROGRESS: "в работе",
      DONE: "выполнена",
      CANCELLED: "отменена",
    };
    return `Последние заявки:\n${requests.map((row) => `#${row.id} · ${row.type.name} · ${labels[row.status]}`).join("\n")}`;
  }

  async function linkEmployeeChat(chatId: number, code: string) {
    const link = await prisma.telegramLinkCode.findUnique({
      where: { code },
      include: {
        user: { select: { id: true, ipName: true, role: true, status: true } },
      },
    });
    if (
      !link ||
      link.usedAt ||
      link.expiresAt <= new Date() ||
      link.user.status !== UserStatus.ACTIVE ||
      link.user.role === Role.CLIENT
    )
      return null;
    await prisma.$transaction([
      prisma.telegramChat.update({
        where: { id: chatId },
        data: { linkedUserId: link.userId, unreadCount: 0 },
      }),
      prisma.telegramLinkCode.update({
        where: { id: link.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return link.user;
  }

  async function handleStaffLink(
    chat: TelegramChatRecord,
    startArgument: string | undefined,
  ) {
    if (!startArgument?.startsWith("staff_")) return false;
    const employee = await linkEmployeeChat(
      chat.id,
      startArgument.slice("staff_".length),
    );
    await reply(
      chat.id,
      chat.externalChatId,
      employee
        ? `Telegram подключён к учётной записи «${employee.ipName}». Теперь вы будете получать рабочие уведомления по заявкам.`
        : "Ссылка недействительна или устарела. Попросите руководителя сформировать новую ссылку.",
    );
    return true;
  }

  async function handleLinkedEmployeeMessage(chat: TelegramChatRecord) {
    if (!chat.linkedUserId) return false;
    const employee = await prisma.user.findUnique({
      where: { id: chat.linkedUserId },
      select: { role: true, status: true },
    });
    if (
      !employee ||
      employee.status !== UserStatus.ACTIVE ||
      employee.role === Role.CLIENT
    )
      return false;
    await reply(
      chat.id,
      chat.externalChatId,
      "Рабочий Telegram подключён. Здесь будут приходить уведомления о назначенных заявках и напоминаниях.",
    );
    return true;
  }

  return {
    statusText,
    handleStaffLink,
    handleLinkedEmployeeMessage,
  };
}
