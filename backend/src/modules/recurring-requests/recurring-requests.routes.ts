import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate } from "../../shared/middleware/auth.js";
import { createRecurringRequestsController } from "./recurring-requests.controller.js";
import { createRecurringRequestsService } from "./recurring-requests.service.js";

export function createRecurringRequestsRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createRecurringRequestsController(
    createRecurringRequestsService(prisma),
  );
  router.use(authenticate);
  router.post("/:id/stop", controllers.stopRecurringScheduleController);
  return router;
}
