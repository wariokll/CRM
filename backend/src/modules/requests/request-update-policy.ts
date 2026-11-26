import {
  PermissionKey,
  RequestStatus,
  Role,
  type Prisma,
} from "@prisma/client";
import { canChangeRequestStatus } from "../../utils/request-status.js";
import {
  hasPermission,
  type UserAccess,
} from "../../shared/middleware/authorization.js";
import { canManageRequest } from "./request-policy.js";
import { updateRequestSchema } from "./request.contracts.js";
import { RequestServiceError } from "./request.errors.js";
import type { z } from "zod";

export type RequestUpdateInput = z.infer<typeof updateRequestSchema>;
export type RequestUpdateRow = Prisma.RequestGetPayload<{
  include: { assignees: true; type: { select: { name: true } } };
}>;

export function assertCanEditRequest(
  access: UserAccess,
  row: RequestUpdateRow,
) {
  const managesCurrent = canManageRequest(access, row.departmentId);
  const isAssignedMaster =
    access.role === Role.MASTER &&
    row.assignees.some((assignee) => assignee.userId === access.userId);
  if (!managesCurrent && !isAssignedMaster)
    throw new RequestServiceError(
      403,
      "Сначала возьмите заявку в работу: сейчас доступен просмотр и комментарии",
    );
  return managesCurrent;
}

function validateStatusUpdate(
  access: UserAccess,
  status: RequestStatus | undefined,
  currentStatus: RequestStatus,
) {
  if (!status) return;
  if (
    status === RequestStatus.CANCELLED &&
    !hasPermission(access, PermissionKey.CANCEL_REQUESTS)
  )
    throw new RequestServiceError(
      403,
      "Отменить заявку может руководитель или начальник отдела",
    );
  if (!canChangeRequestStatus(currentStatus, status))
    throw new RequestServiceError(400, "Недопустимый переход статуса");
}

export function validateRequestUpdate(
  access: UserAccess,
  managesCurrent: boolean,
  row: RequestUpdateRow,
  update: RequestUpdateInput,
) {
  validateStatusUpdate(access, update.status, row.status);
  if (
    update.priority &&
    (!managesCurrent || !hasPermission(access, PermissionKey.SET_PRIORITY))
  )
    throw new RequestServiceError(
      403,
      "Недостаточно прав для изменения приоритета",
    );
  if (
    update.departmentId &&
    update.departmentId !== row.departmentId &&
    (!managesCurrent || !hasPermission(access, PermissionKey.TRANSFER_REQUESTS))
  )
    throw new RequestServiceError(403, "Недостаточно прав для передачи заявки");
  if (
    update.assigneeIds &&
    (!managesCurrent || !hasPermission(access, PermissionKey.ASSIGN_MASTERS))
  )
    throw new RequestServiceError(
      403,
      "Недостаточно прав для назначения мастеров",
    );
}
