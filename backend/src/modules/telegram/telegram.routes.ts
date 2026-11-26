import { PermissionKey } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { validateBody } from "../../shared/middleware/validate.js";
import { createTelegramControllers } from "./telegram.controller.js";
import { createTelegramService } from "./telegram.service.js";
import {
  replaceTelegramLinksSchema,
  sendTelegramMessageSchema,
  updateTelegramChatSchema,
} from "./telegram.schemas.js";

export function createTelegramRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createTelegramControllers(createTelegramService(prisma));
  router.use(
    authenticate,
    requirePermission(PermissionKey.VIEW_TELEGRAM, prisma),
  );
  router.get("/integrations", controllers.listIntegrationsController);
  router.get("/chats", controllers.listChatsController);
  router.get("/chats/:id/messages", controllers.listChatMessagesController);
  router.patch(
    "/chats/:id/link",
    validateBody(updateTelegramChatSchema),
    controllers.updateTelegramChatController,
  );
  router.put(
    "/chats/:id/links",
    validateBody(replaceTelegramLinksSchema),
    controllers.replaceTelegramChatLinksController,
  );
  router.post(
    "/chats/:id/messages",
    requirePermission(PermissionKey.SEND_TELEGRAM, prisma),
    validateBody(sendTelegramMessageSchema),
    controllers.sendTelegramMessageController,
  );

  return router;
}
