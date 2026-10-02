import { Role } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { canManageRequest } from "../modules/requests/request-policy.js";
import { getUserAccess } from "../utils/permissions.js";

export const recurringRequestsRouter = Router();
recurringRequestsRouter.use(authenticate);

/** Stops future occurrences. Existing requests remain available in the CRM. */
recurringRequestsRouter.post("/:id/stop", async (req, res) => {
  const id = Number(req.params.id);
  const access = await getUserAccess(req.auth!.userId);
  if (!access || access.role === Role.CLIENT)
    return res.status(403).json({ message: "Недостаточно прав" });
  const schedule = await prisma.recurringRequestSchedule.findUnique({
    where: { id },
    select: { id: true, departmentId: true, isActive: true },
  });
  if (!schedule)
    return res
      .status(404)
      .json({ message: "Повторяющееся расписание не найдено" });
  if (!canManageRequest(access, schedule.departmentId))
    return res
      .status(403)
      .json({
        message: "Недостаточно прав для остановки расписания этого отдела",
      });
  if (schedule.isActive)
    await prisma.recurringRequestSchedule.update({
      where: { id },
      data: { isActive: false },
    });
  res.status(204).end();
});
