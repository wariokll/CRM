import { TelegramIntegrationStatus } from "@prisma/client";
import { config } from "../config.js";
import { prisma } from "../db.js";
import {
  botApi,
  integration,
  processUpdate,
  type TelegramUpdate,
} from "./bot-handlers.js";

let stopped = false;

async function main() {
  if (!config.telegramBotToken) {
    console.log("Telegram bot is disabled: TELEGRAM_BOT_TOKEN is not set");
    return;
  }
  const item = await integration();
  try {
    const me = await botApi<{ username?: string }>("getMe");
    await prisma.telegramIntegration.update({
      where: { id: item.id },
      data: {
        status: TelegramIntegrationStatus.ACTIVE,
        displayName: me.username
          ? `@${me.username}`
          : `@${config.telegramBotUsername}`,
        lastConnectedAt: new Date(),
        lastError: null,
      },
    });
    await botApi<boolean>("setMyCommands", {
      commands: [
        { command: "start", description: "Главное меню" },
        { command: "new", description: "Создать заявку" },
        { command: "status", description: "Мои заявки" },
      ],
    });
    console.log(
      `Telegram bot @${me.username ?? config.telegramBotUsername} is polling for updates`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Telegram configuration error";
    await prisma.telegramIntegration.update({
      where: { id: item.id },
      data: { status: TelegramIntegrationStatus.ERROR, lastError: message },
    });
    throw error;
  }
  let offset = 0;
  while (!stopped) {
    try {
      const updates = await botApi<TelegramUpdate[]>("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query"],
      });
      for (const update of updates) {
        offset = update.update_id + 1;
        await processUpdate(item.id, update);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Telegram polling error";
      await prisma.telegramIntegration.update({
        where: { id: item.id },
        data: { status: TelegramIntegrationStatus.ERROR, lastError: message },
      });
      console.error(message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

process.on("SIGINT", () => {
  stopped = true;
});
process.on("SIGTERM", () => {
  stopped = true;
});
if (!process.env.VITEST) main().finally(() => prisma.$disconnect());
