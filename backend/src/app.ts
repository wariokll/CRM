import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RequestHandler } from "express";
import {
  TelegramIntegrationKind,
  TelegramIntegrationStatus,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { errorHandler } from "./shared/middleware/errors.js";
import { requestLogger } from "./shared/middleware/request-logger.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { boardsRouter } from "./modules/boards/board.routes.js";
import { knowledgeRouter } from "./modules/knowledge/knowledge.routes.js";
import { createDepartmentsRouter } from "./modules/departments/departments.routes.js";
import { createComponentsRouter } from "./modules/components/components.routes.js";
import { moderationRouter } from "./modules/moderation/moderation.routes.js";
import { createOrganizationsRouter } from "./modules/organizations/organizations.routes.js";
import { requestsRouter } from "./modules/requests/request.routes.js";
import { requestTypesRouter } from "./modules/request-types/request-types.routes.js";
import { recurringRequestsRouter } from "./modules/recurring-requests/recurring-requests.routes.js";
import { staffRouter } from "./modules/staff/staff.routes.js";
import { createStoresRouter } from "./modules/stores/stores.routes.js";
import { telegramRouter } from "./modules/telegram/telegram.routes.js";
import { createUsersRouter } from "./modules/users/users.routes.js";

export interface AppDependencies {
  prisma: PrismaClient;
  requestLogger?: RequestHandler;
}

export function createApp(deps: AppDependencies = { prisma }) {
  const app = express();
  // Caddy terminates TLS in production; Express must trust its forwarded protocol for secure cookies.
  if (config.isProduction) app.set("trust proxy", 1);
  app.use(deps.requestLogger ?? requestLogger);
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.get("/api/health", async (_req, res) => {
    await deps.prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: true });
  });
  app.get("/api/health/telegram", async (_req, res) => {
    if (!config.telegramBotToken)
      return res.json({ ok: true, configured: false, status: "DISABLED" });
    const integration = await deps.prisma.telegramIntegration.findUnique({
      where: { kind: TelegramIntegrationKind.BOT },
      select: { status: true, lastConnectedAt: true, lastError: true },
    });
    const healthy = integration?.status === TelegramIntegrationStatus.ACTIVE;
    res.status(healthy ? 200 : 503).json({
      ok: healthy,
      configured: true,
      status: integration?.status ?? "CONNECTING",
      lastConnectedAt: integration?.lastConnectedAt ?? null,
      ...(integration?.lastError && { error: integration.lastError }),
    });
  });
  app.use("/api/auth", createAuthRouter(deps.prisma));
  app.use("/api/knowledge", knowledgeRouter);
  app.use("/api/boards", boardsRouter);
  app.use("/api/departments", createDepartmentsRouter(deps.prisma));
  app.use("/api/components", createComponentsRouter(deps.prisma));
  app.use("/api/organizations", createOrganizationsRouter(deps.prisma));
  app.use("/api/stores", createStoresRouter(deps.prisma));
  app.use("/api/requests", requestsRouter);
  app.use("/api/recurring-requests", recurringRequestsRouter);
  app.use("/api/request-types", requestTypesRouter);
  app.use("/api/moderation", moderationRouter);
  app.use("/api/users", createUsersRouter(deps.prisma));
  app.use("/api/staff", staffRouter);
  app.use("/api/telegram", telegramRouter);
  const frontendDist = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../dist",
  );
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/^(?!\/api).*/, (_req, res) =>
      res.sendFile(resolve(frontendDist, "index.html")),
    );
  }
  app.use(errorHandler);
  return app;
}
