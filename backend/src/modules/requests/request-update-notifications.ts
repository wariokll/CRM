import { RequestStatus, type Prisma } from "@prisma/client";
import type { z } from "zod";
import type { updateRequestSchema } from "./request.contracts.js";
import type { createTelegramNotifications } from "../../utils/telegram-notifications.js";

type RequestUpdateInput = z.infer<typeof updateRequestSchema>;
type RequestUpdateRow = Prisma.RequestGetPayload<{
  include: { assignees: true; type: { select: { name: true } } };
}>;
type TelegramNotifications = ReturnType<typeof createTelegramNotifications>;

export function notifyRequestUpdate(
  row: RequestUpdateRow,
  update: RequestUpdateInput,
  notifications: Pick<
    TelegramNotifications,
    "notifyRequestClient" | "notifyRequestAssignees"
  >,
) {
  const { notifyRequestClient, notifyRequestAssignees } = notifications;
  const labels: Record<RequestStatus, string> = {
    NEW: "Новая",
    ACCEPTED: "Принята",
    IN_PROGRESS: "В работе",
    DONE: "Выполнена",
    CANCELLED: "Отменена",
  };
  if (update.status && update.status !== row.status) {
    void notifyRequestClient(
      row.id,
      `Заявка #${row.id}: статус изменён на «${labels[update.status]}».`,
    );
    void notifyRequestAssignees(
      row.id,
      `Заявка «${row.type.name}»: статус изменён на «${labels[update.status]}».`,
    );
  }
  if (update.adminComment?.trim())
    void notifyRequestClient(
      row.id,
      `Новый комментарий по заявке #${row.id}:\n${update.adminComment.trim()}`,
    );
  if (update.assigneeIds?.length)
    void notifyRequestAssignees(
      row.id,
      `Вам назначена заявка «${row.type.name}». Откройте БАЗИС CRM для деталей.`,
    );
}
