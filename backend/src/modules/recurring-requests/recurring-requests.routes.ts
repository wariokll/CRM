import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.js";
import { stopRecurringScheduleController } from "./recurring-requests.controller.js";

export const recurringRequestsRouter = Router();
recurringRequestsRouter.use(authenticate);
recurringRequestsRouter.post("/:id/stop", stopRecurringScheduleController);
