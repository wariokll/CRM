import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pinoHttp } from "pino-http";
import {
  TelegramIntegrationKind,
  TelegramIntegrationStatus,
} from "@prisma/client";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { errorHandler } from "./middleware/errors.js";
import { authRouter } from "./routes/auth.js";
import { boardsRouter } from "./routes/boards.js";
import { departmentsRouter } from "./routes/departments.js";
import { componentsRouter } from "./routes/components.js";
import { moderationRouter } from "./routes/moderation.js";
import { organizationsRouter } from "./routes/organizations.js";
import { requestsRouter } from "./routes/requests.js";
import { requestTypesRouter } from "./routes/request-types.js";
import { recurringRequestsRouter } from "./routes/recurring-requests.js";
import { staffRouter } from "./routes/staff.js";
import { storesRouter } from "./routes/stores.js";
import { telegramRouter } from "./routes/telegram.js";
import { usersRouter } from "./routes/users.js";

export const app = express();
// Caddy terminates TLS in production; Express must trust its forwarded protocol for secure cookies.
if (config.isProduction) app.set("trust proxy", 1);
app.use(pinoHttp());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/api/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, database: true });
});
app.get("/api/health/telegram", async (_req, res) => {
  if (!config.telegramBotToken)
    return res.json({ ok: true, configured: false, status: "DISABLED" });
  const integration = await prisma.telegramIntegration.findUnique({
    where: { kind: TelegramIntegrationKind.BOT },
    select: { status: true, lastConnectedAt: true, lastError: true },
  });
  const healthy = integration?.status === TelegramIntegrationStatus.ACTIVE;
  res
    .status(healthy ? 200 : 503)
    .json({
      ok: healthy,
      configured: true,
      status: integration?.status ?? "CONNECTING",
      lastConnectedAt: integration?.lastConnectedAt ?? null,
      ...(integration?.lastError && { error: integration.lastError }),
    });
});
app.use("/api/auth", authRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/components", componentsRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/stores", storesRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/recurring-requests", recurringRequestsRouter);
app.use("/api/request-types", requestTypesRouter);
app.use("/api/moderation", moderationRouter);
app.use("/api/users", usersRouter);
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
