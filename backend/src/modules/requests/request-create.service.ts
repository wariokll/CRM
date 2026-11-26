import { Priority, RequestSource, type Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { nextRecurringDate } from "../../utils/business-days.js";
import {
  getUserAccess,
  type UserAccess,
} from "../../shared/middleware/authorization.js";
import { requestInclude } from "./request.include.js";
import { createRequestSchema } from "./request.contracts.js";
import { createTelegramNotifications } from "../../utils/telegram-notifications.js";
import { RequestServiceError } from "./request.errors.js";
import { createRequestTargetService } from "./request-create-targets.js";
import type {
  ActiveRequestType,
  RequestCreationBody,
} from "./request-create.types.js";

export function createRequestCreationService(prisma: PrismaClient) {
  const { notifyRequestAssignees } = createTelegramNotifications(prisma);
  const {
    resolveRequestComponentsAndDepartment,
    validateRequestSchedule,
    resolveRequestTarget,
    resolveRequestAssignee,
    prepareRequestMetadata,
  } = createRequestTargetService(prisma);
  type RequestCreationPersistArgs = {
    body: RequestCreationBody;
    type: ActiveRequestType;
    access: UserAccess;
    store: Awaited<ReturnType<typeof resolveRequestTarget>>["store"];
    organizationId: number | null;
    requestedDepartment: number;
    componentsData: Awaited<
      ReturnType<typeof resolveRequestComponentsAndDepartment>
    >["componentsData"];
    assignee: { id: number; ipName: string } | null;
    createdByUserId: number;
    priority: Priority;
    scheduledAt: Date | null;
  };

  async function createRequestRecurrence(
    transaction: Prisma.TransactionClient,
    context: RequestCreationPersistArgs,
  ) {
    const {
      body,
      type,
      access,
      store,
      organizationId,
      requestedDepartment,
      componentsData,
      assignee,
      createdByUserId,
      priority,
      scheduledAt,
    } = context;
    const recurrenceSchedule =
      body.recurrenceIntervalDays && scheduledAt
        ? await transaction.recurringRequestSchedule.create({
            data: {
              storeId: store?.id ?? null,
              organizationId,
              createdByUserId: createdByUserId,
              typeId: type.id,
              departmentId: requestedDepartment,
              priority: priority,
              description: body.description,
              templateData: body.templateData as
                Prisma.InputJsonValue | undefined,
              componentsData: componentsData as
                Prisma.InputJsonValue | undefined,
              assigneeUserId: assignee?.id ?? null,
              intervalDays: body.recurrenceIntervalDays,
              nextScheduledAt: nextRecurringDate(
                body.scheduledAt!,
                body.recurrenceIntervalDays,
              ),
              createdById: access.userId,
            },
          })
        : null;
    return recurrenceSchedule;
  }

  async function recordRequestCreationEvents(
    transaction: Prisma.TransactionClient,
    context: RequestCreationPersistArgs,
    created: Prisma.RequestGetPayload<Prisma.RequestDefaultArgs>,
    recurrenceSchedule: Awaited<ReturnType<typeof createRequestRecurrence>>,
  ) {
    const { body, access, requestedDepartment, assignee } = context;
    await transaction.requestDepartmentHistory.create({
      data: {
        requestId: created.id,
        toDepartmentId: requestedDepartment,
        transferredByUserId: access.userId,
      },
    });
    await transaction.requestActivity.create({
      data: {
        requestId: created.id,
        authorUserId: access.userId,
        kind: "CREATED",
        message: recurrenceSchedule
          ? `Создана повторяющаяся заявка: каждые ${body.recurrenceIntervalDays} дн.`
          : "Заявка создана",
      },
    });
    if (assignee) {
      await transaction.requestAssignee.create({
        data: {
          requestId: created.id,
          userId: assignee.id,
          assignedByUserId: access.userId,
        },
      });
      await transaction.requestActivity.create({
        data: {
          requestId: created.id,
          authorUserId: access.userId,
          kind: "ASSIGNEES_CHANGED",
          message: `Исполнитель назначен при создании: ${assignee.ipName}`,
        },
      });
    }
  }

  async function recordRequestCreation(
    transaction: Prisma.TransactionClient,
    context: RequestCreationPersistArgs,
    recurrenceSchedule: Awaited<ReturnType<typeof createRequestRecurrence>>,
  ) {
    const {
      body,
      type,
      store,
      organizationId,
      requestedDepartment,
      componentsData,
      createdByUserId,
      priority,
      scheduledAt,
    } = context;
    const created = await transaction.request.create({
      data: {
        storeId: store?.id ?? null,
        organizationId,
        createdByUserId: createdByUserId,
        typeId: type.id,
        departmentId: requestedDepartment,
        urgency: body.urgency,
        priority: priority,
        source: body.source ?? RequestSource.WEB,
        scheduledAt: scheduledAt,
        description: body.description,
        templateData: body.templateData as Prisma.InputJsonValue | undefined,
        componentsData: componentsData as Prisma.InputJsonValue | undefined,
        recurrenceScheduleId: recurrenceSchedule?.id,
      },
    });
    await recordRequestCreationEvents(
      transaction,
      context,
      created,
      recurrenceSchedule,
    );
    return created;
  }

  async function persistNewRequest(context: RequestCreationPersistArgs) {
    return prisma.$transaction(async (transaction) => {
      const recurrenceSchedule = await createRequestRecurrence(
        transaction,
        context,
      );
      const created = await recordRequestCreation(
        transaction,
        context,
        recurrenceSchedule,
      );
      return transaction.request.findUniqueOrThrow({
        where: { id: created.id },
        include: requestInclude,
      });
    });
  }

  async function createRequest(userId: number, input: unknown) {
    const body = createRequestSchema.parse(input);
    const access = await getUserAccess(userId, prisma);
    if (!access || access.status !== "ACTIVE")
      throw new RequestServiceError(403, "Аккаунт ещё не одобрен");
    const { type, store, organizationId } = await resolveRequestTarget(
      body,
      access,
    );
    validateRequestSchedule(body, type, access);
    const { componentsData, requestedDepartment } =
      await resolveRequestComponentsAndDepartment(body, type, access);
    const assignee = await resolveRequestAssignee(body, access);
    const metadata = await prepareRequestMetadata(
      body,
      type,
      access,
      organizationId,
    );
    const request = await persistNewRequest({
      body,
      type,
      access,
      store,
      organizationId,
      requestedDepartment,
      componentsData,
      assignee,
      ...metadata,
    });
    if (assignee)
      void notifyRequestAssignees(
        request.id,
        `Вам назначена новая заявка «${type.name}». Откройте БАЗИС CRM для деталей.`,
        [assignee.id],
      );
    return request;
  }

  return { createRequest };
}
