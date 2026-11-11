import { PermissionKey } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import {
  listChatMessagesController,
  listChatsController,
  listIntegrationsController,
  replaceTelegramChatLinksController,
  sendTelegramMessageController,
  updateTelegramChatController,
} from "./telegram.controller.js";
import {
  replaceTelegramLinksSchema,
  sendTelegramMessageSchema,
  updateTelegramChatSchema,
} from "./telegram.schemas.js";

export const telegramRouter = Router();
telegramRouter.use(
  authenticate,
  requirePermission(PermissionKey.VIEW_TELEGRAM),
);
telegramRouter.get("/integrations", listIntegrationsController);
telegramRouter.get("/chats", listChatsController);
telegramRouter.get("/chats/:id/messages", listChatMessagesController);
telegramRouter.patch(
  "/chats/:id/link",
  validateBody(updateTelegramChatSchema),
  updateTelegramChatController,
);
telegramRouter.put(
  "/chats/:id/links",
  validateBody(replaceTelegramLinksSchema),
  replaceTelegramChatLinksController,
);
telegramRouter.post(
  "/chats/:id/messages",
  requirePermission(PermissionKey.SEND_TELEGRAM),
  validateBody(sendTelegramMessageSchema),
  sendTelegramMessageController,
);
