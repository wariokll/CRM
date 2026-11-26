import type { RequestHandler } from "express";
import type { createTelegramService } from "./telegram.service.js";
import type {
  ReplaceTelegramLinksInput,
  SendTelegramMessageInput,
  UpdateTelegramChatInput,
} from "./telegram.schemas.js";

export function createTelegramControllers(
  service: ReturnType<typeof createTelegramService>,
) {
  const {
    listChatMessages,
    listChats,
    listIntegrations,
    replaceTelegramChatLinks,
    sendTelegramMessage,
    updateTelegramChat,
  } = service;

  const listIntegrationsController: RequestHandler = async (_req, res) =>
    res.json(await listIntegrations());

  const listChatsController: RequestHandler = async (_req, res) =>
    res.json(await listChats());

  const listChatMessagesController: RequestHandler = async (req, res) =>
    res.json(await listChatMessages(Number(req.params.id)));

  const updateTelegramChatController: RequestHandler = async (req, res) =>
    res.json(
      await updateTelegramChat(
        Number(req.params.id),
        req.body as UpdateTelegramChatInput,
      ),
    );

  const replaceTelegramChatLinksController: RequestHandler = async (req, res) =>
    res.json(
      await replaceTelegramChatLinks(
        Number(req.params.id),
        req.body as ReplaceTelegramLinksInput,
      ),
    );

  const sendTelegramMessageController: RequestHandler = async (req, res) =>
    res.json(
      await sendTelegramMessage(
        Number(req.params.id),
        req.body as SendTelegramMessageInput,
      ),
    );

  return {
    listIntegrationsController,
    listChatsController,
    listChatMessagesController,
    updateTelegramChatController,
    replaceTelegramChatLinksController,
    sendTelegramMessageController,
  };
}
