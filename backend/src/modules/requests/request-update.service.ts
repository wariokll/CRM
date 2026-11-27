import {
  CommentVisibility,
  Priority,
  RequestStatus,
  Role,
  type Prisma,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import {
  getUserAccess,
  type UserAccess,
} from "../../shared/middleware/authorization.js";
import { requestVisibilityWhere } from "./request-policy.js";
import { requestInclude } from "./request.include.js";
import { createTelegramNotifications } from "../../utils/telegram-notifications.js";
import { RequestServiceError } from "./request.errors.js";
import { notifyRequestUpdate } from "./request-update-notifications.js";
import {
  assertCanEditRequest,
  validateRequestUpdate,
  type RequestUpdateInput,
  type RequestUpdateRow,
} from "./request-update-policy.js";

export function createRequestUpdateService(prisma: PrismaClient) {
  const { notifyRequestAssignees, notifyRequestClient } =
    createTelegramNotifications(prisma);
  async function updateRequestAssignees(
    transaction: Prisma.TransactionClient,
    access: UserAccess,
    row: RequestUpdateRow,
    update: RequestUpdateInput,
    departmentId: number,
  ) {
    if (!update.assigneeIds) return;
    const ids = [...new Set(update.assigneeIds)];
    const eligible = await transaction.user.findMany({
      where: {
        id: { in: ids },
        status: "ACTIVE",
        OR: [
          { role: Role.DIRECTOR },
          {
            role: { in: [Role.MASTER, Role.DEPARTMENT_HEAD] },
            departmentMemberships: { some: { departmentId } },
          },
        ],
      },
      select: { id: true },
    });
    if (eligible.length !== ids.length)
      throw new Error(
        "Выбранный сотрудник не состоит в отделе заявки или недоступен",
      );
    await transaction.requestAssignee.deleteMany({
      where: { requestId: row.id },
    });
    if (ids.length)
      await transaction.requestAssignee.createMany({
        data: ids.map((assignedUserId) => ({
          requestId: row.id,
          userId: assignedUserId,
          assignedByUserId: access.userId,
        })),
      });
  }

  async function createUpdateActivity(
    transaction: Prisma.TransactionClient,
    row: RequestUpdateRow,
    access: UserAccess,
    kind: string,
    message: string,
  ) {
    await transaction.requestActivity.create({
      data: { requestId: row.id, authorUserId: access.userId, kind, message },
    });
  }

  async function createStatusAndPriorityActivities(
    transaction: Prisma.TransactionClient,
    access: UserAccess,
    row: RequestUpdateRow,
    update: RequestUpdateInput,
  ) {
    const statusLabels: Record<RequestStatus, string> = {
      NEW: "Новая",
      ACCEPTED: "Принята",
      IN_PROGRESS: "В работе",
      DONE: "Выполнена",
      CANCELLED: "Отменена",
    };
    const priorityLabels: Record<Priority, string> = {
      LOW: "низкий",
      NORMAL: "обычный",
      HIGH: "высокий",
      CRITICAL: "критический",
    };
    if (update.status && update.status !== row.status)
      await createUpdateActivity(
        transaction,
        row,
        access,
        "STATUS_CHANGED",
        `Статус изменён: «${statusLabels[row.status]}» → «${statusLabels[update.status]}»`,
      );
    if (update.priority && update.priority !== row.priority)
      await createUpdateActivity(
        transaction,
        row,
        access,
        "PRIORITY_CHANGED",
        `Приоритет изменён: «${priorityLabels[row.priority]}» → «${priorityLabels[update.priority]}»`,
      );
  }

  async function createTransferAndAssigneeActivities(
    transaction: Prisma.TransactionClient,
    access: UserAccess,
    row: RequestUpdateRow,
    update: RequestUpdateInput,
  ) {
    if (update.departmentId && update.departmentId !== row.departmentId)
      await createUpdateActivity(
        transaction,
        row,
        access,
        "DEPARTMENT_CHANGED",
        "Заявка передана в другой отдел",
      );
    if (update.assigneeIds)
      await createUpdateActivity(
        transaction,
        row,
        access,
        "ASSIGNEES_CHANGED",
        update.assigneeIds.length
          ? "Исполнители обновлены"
          : "Исполнители сняты с заявки",
      );
    if (update.adminComment?.trim())
      await transaction.requestComment.create({
        data: {
          requestId: row.id,
          authorUserId: access.userId,
          visibility: CommentVisibility.CLIENT,
          body: update.adminComment.trim(),
        },
      });
  }

  async function createRequestUpdateActivities(
    transaction: Prisma.TransactionClient,
    access: UserAccess,
    row: RequestUpdateRow,
    update: RequestUpdateInput,
  ) {
    await createStatusAndPriorityActivities(transaction, access, row, update);
    await createTransferAndAssigneeActivities(transaction, access, row, update);
  }

  async function persistRequestFields(
    transaction: Prisma.TransactionClient,
    row: RequestUpdateRow,
    update: RequestUpdateInput,
  ) {
    await transaction.request.update({
      where: { id: row.id },
      data: {
        ...(update.status && { status: update.status }),
        ...(update.priority && { priority: update.priority }),
        ...(update.departmentId && { departmentId: update.departmentId }),
        ...(update.adminComment !== undefined && {
          adminComment: update.adminComment,
        }),
        ...((update.status === RequestStatus.DONE ||
          update.status === RequestStatus.CANCELLED) && {
          closedAt: new Date(),
        }),
      },
    });
  }

  async function prepareRequestUpdate(userId: number, id: number) {
    const access = await getUserAccess(userId, prisma);
    if (!access || access.role === Role.CLIENT)
      throw new RequestServiceError(403, "Недостаточно прав");
    const row = await prisma.request.findFirst({
      where: { id, AND: [requestVisibilityWhere(access)] },
      include: { assignees: true, type: { select: { name: true } } },
    });
    if (!row) throw new RequestServiceError(404, "Заявка не найдена");
    return { access, row };
  }

  async function updatePreparedRequest(
    context: Awaited<ReturnType<typeof prepareRequestUpdate>>,
    update: RequestUpdateInput,
  ) {
    const { access, row } = context;
    const managesCurrent = assertCanEditRequest(access, row);
    validateRequestUpdate(access, managesCurrent, row, update);
    await prisma.$transaction(async (transaction) => {
      const departmentId = update.departmentId ?? row.departmentId;
      if (update.departmentId && update.departmentId !== row.departmentId) {
        await transaction.requestDepartmentHistory.create({
          data: {
            requestId: row.id,
            fromDepartmentId: row.departmentId,
            toDepartmentId: update.departmentId,
            transferredByUserId: access.userId,
          },
        });
        await transaction.requestAssignee.deleteMany({
          where: { requestId: row.id },
        });
      }
      await updateRequestAssignees(
        transaction,
        access,
        row,
        update,
        departmentId,
      );
      await persistRequestFields(transaction, row, update);
      await createRequestUpdateActivities(transaction, access, row, update);
    });
    notifyRequestUpdate(row, update, {
      notifyRequestClient,
      notifyRequestAssignees,
    });
    return prisma.request.findUniqueOrThrow({
      where: { id: row.id },
      include: requestInclude,
    });
  }

  return { prepareRequestUpdate, updatePreparedRequest };
}
