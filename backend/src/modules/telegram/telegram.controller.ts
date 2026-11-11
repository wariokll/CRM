import type { RequestHandler } from "express";
import {
  listChatMessages,
  listChats,
  listIntegrations,
  replaceTelegramChatLinks,
  sendTelegramMessage,
  updateTelegramChat,
} from "./telegram.service.js";
import type {
  ReplaceTelegramLinksInput,
  SendTelegramMessageInput,
  UpdateTelegramChatInput,
} from "./telegram.schemas.js";

export const listIntegrationsController: RequestHandler = async (_req, res) =>
  res.json(await listIntegrations());

export const listChatsController: RequestHandler = async (_req, res) =>
  res.json(await listChats());

export const listChatMessagesController: RequestHandler = async (req, res) =>
  res.json(await listChatMessages(Number(req.params.id)));

export const updateTelegramChatController: RequestHandler = async (req, res) =>
  res.json(
    await updateTelegramChat(
      Number(req.params.id),
      req.body as UpdateTelegramChatInput,
    ),
  );

export const replaceTelegramChatLinksController: RequestHandler = async (
  req,
  res,
) =>
  res.json(
    await replaceTelegramChatLinks(
      Number(req.params.id),
      req.body as ReplaceTelegramLinksInput,
    ),
  );

export const sendTelegramMessageController: RequestHandler = async (req, res) =>
  res.json(
    await sendTelegramMessage(
      Number(req.params.id),
      req.body as SendTelegramMessageInput,
    ),
  );
