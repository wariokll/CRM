import { Role } from "@prisma/client";
import { prisma } from "../../db.js";
import { getUserAccess } from "../../shared/middleware/authorization.js";
import { canManageRequest } from "../requests/request-policy.js";

type StopScheduleResult =
  { status: 204 } | { status: 403 | 404; message: string };

export async function stopRecurringSchedule(
  scheduleId: number,
  userId: number,
): Promise<StopScheduleResult> {
  const access = await getUserAccess(userId);
  if (!access || access.role === Role.CLIENT)
    return { status: 403, message: "Недостаточно прав" };

  const schedule = await prisma.recurringRequestSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, departmentId: true, isActive: true },
  });
  if (!schedule)
    return { status: 404, message: "Повторяющееся расписание не найдено" };
  if (!canManageRequest(access, schedule.departmentId))
    return {
      status: 403,
      message: "Недостаточно прав для остановки расписания этого отдела",
    };

  if (schedule.isActive)
    await prisma.recurringRequestSchedule.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });

  return { status: 204 };
}
