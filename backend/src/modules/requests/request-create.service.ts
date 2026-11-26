import {
  PermissionKey,
  Priority,
  RequestSource,
  Role,
  Urgency,
  type Prisma,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  moveToPreviousBusinessDay,
  nextRecurringDate,
} from "../../utils/business-days.js";
import {
  getUserAccess,
  hasPermission,
  type UserAccess,
} from "../../shared/middleware/authorization.js";
import { requestInclude } from "./request.include.js";
import {
  createRequestSchema,
  validateRequiredTemplateFields,
} from "./request.contracts.js";
import { createTelegramNotifications } from "../../utils/telegram-notifications.js";
import { RequestServiceError } from "./request.errors.js";

type RequestCreationBody = z.infer<typeof createRequestSchema>;
type ActiveRequestType = Prisma.RequestTypeGetPayload<{
  include: { department: true };
}>;

export function createRequestCreationService(prisma: PrismaClient) {
  const { notifyRequestAssignees } = createTelegramNotifications(prisma);
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

  async function resolveRequestComponentsAndDepartment(
    body: RequestCreationBody,
    type: ActiveRequestType,
    access: UserAccess,
  ) {
    if (type.requiresComponents && !body.components?.length)
      throw new RequestServiceError(
        400,
        "Добавьте хотя бы один необходимый компонент",
      );
    const componentIds = [
      ...new Set(body.components?.map((item) => item.componentId) ?? []),
    ];
    if (componentIds.length !== (body.components?.length ?? 0))
      throw new RequestServiceError(
        400,
        "Один компонент нельзя указать в заявке дважды",
      );
    const catalogComponents = componentIds.length
      ? await prisma.component.findMany({
          where: { id: { in: componentIds }, isActive: true },
          select: { id: true, name: true },
        })
      : [];
    if (catalogComponents.length !== componentIds.length)
      throw new RequestServiceError(
        400,
        "Один из выбранных компонентов недоступен",
      );
    const componentNames = new Map(
      catalogComponents.map((component) => [component.id, component.name]),
    );
    const componentsData = body.components?.map((item) => ({
      componentId: item.componentId,
      name: componentNames.get(item.componentId)!,
      quantity: item.quantity,
    }));
    const requestedDepartment = body.departmentId ?? type.departmentId;
    if (
      access.role === Role.CLIENT &&
      requestedDepartment !== type.departmentId
    )
      throw new RequestServiceError(403, "Отдел определяется шаблоном заявки");
    return { componentsData, requestedDepartment };
  }

  function validateRequestSchedule(
    body: RequestCreationBody,
    type: ActiveRequestType,
    access: UserAccess,
  ) {
    if (body.urgency === Urgency.SCHEDULED && !body.scheduledAt)
      throw new RequestServiceError(400, "Укажите дату плановой заявки");
    if (
      body.scheduledAt &&
      (body.scheduledAt.getTime() > Date.now() + 366 * 86400000 ||
        body.scheduledAt.getTime() < Date.now())
    )
      throw new RequestServiceError(
        400,
        "Дата должна быть в пределах следующего года",
      );
    if (body.recurrenceIntervalDays && body.urgency !== Urgency.SCHEDULED)
      throw new RequestServiceError(
        400,
        "Повторение доступно только для плановой заявки",
      );
    if (body.recurrenceIntervalDays && access.role === Role.CLIENT)
      throw new RequestServiceError(
        403,
        "Повторяющееся расписание может создать только сотрудник",
      );
    try {
      validateRequiredTemplateFields(
        type.templateFields,
        body.templateData ?? {},
      );
    } catch (error) {
      throw new RequestServiceError(
        400,
        error instanceof Error ? error.message : "Заполните обязательные поля",
      );
    }
  }

  async function resolveRequestTarget(
    body: RequestCreationBody,
    access: UserAccess,
  ) {
    const type = await prisma.requestType.findFirst({
      where: { id: body.typeId, isActive: true },
      include: { department: true },
    });
    if (!type) throw new RequestServiceError(400, "Тип заявки недоступен");
    const store = body.storeId
      ? await prisma.store.findFirst({
          where: { id: body.storeId, status: "ACTIVE" },
          include: { organization: { include: { members: true } } },
        })
      : null;
    const organizationId = body.organizationId ?? store?.organizationId ?? null;
    if (type.requiresStore && !store)
      throw new RequestServiceError(
        400,
        "Для этого типа заявки выберите торговую точку",
      );
    if (type.requiresOrganization && !organizationId)
      throw new RequestServiceError(
        400,
        "Для этого типа заявки выберите организацию",
      );
    if (organizationId && !store) {
      const organization = await prisma.organization.findFirst({
        where: { id: organizationId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!organization)
        throw new RequestServiceError(
          400,
          "Выбранная организация не найдена или ещё не принята. Выберите активную организацию.",
        );
    }
    if (store && organizationId && store.organizationId !== organizationId)
      throw new RequestServiceError(
        400,
        "Точка не относится к выбранной организации",
      );
    if (access.role === Role.CLIENT && organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId, userId: access.userId },
        },
      });
      if (!membership)
        throw new RequestServiceError(403, "Нет доступа к организации");
    }
    return { type, store, organizationId };
  }

  async function resolveRequestAssignee(
    body: RequestCreationBody,
    access: UserAccess,
  ) {
    let assignee: { id: number; ipName: string } | null = null;
    if (body.assigneeId) {
      if (access.role === Role.CLIENT)
        throw new RequestServiceError(
          403,
          "Клиент не может назначать исполнителя",
        );
      if (access.role === Role.MASTER && body.assigneeId !== access.userId)
        throw new RequestServiceError(
          403,
          "Мастер может назначить исполнителем только себя",
        );
      assignee = await prisma.user.findFirst({
        where: {
          id: body.assigneeId,
          status: "ACTIVE",
          role: { not: Role.CLIENT },
        },
        select: { id: true, ipName: true },
      });
      if (!assignee)
        throw new RequestServiceError(
          400,
          "Выбранный исполнитель недоступен или не является сотрудником",
        );
    }
    return assignee;
  }

  async function prepareRequestMetadata(
    body: RequestCreationBody,
    type: ActiveRequestType,
    access: UserAccess,
    organizationId: number | null,
  ) {
    const primaryMember = organizationId
      ? await prisma.organizationMember.findFirst({
          where: { organizationId },
          orderBy: { isPrimary: "desc" },
        })
      : null;
    const createdByUserId =
      access.role === Role.CLIENT
        ? access.userId
        : (primaryMember?.userId ?? access.userId);
    const priority =
      access.role !== Role.CLIENT &&
      hasPermission(access, PermissionKey.SET_PRIORITY)
        ? (body.priority ?? type.defaultPriority)
        : type.defaultPriority;
    const scheduledAt =
      body.urgency === Urgency.URGENT
        ? null
        : body.scheduledAt
          ? moveToPreviousBusinessDay(body.scheduledAt)
          : null;
    return { createdByUserId, priority, scheduledAt };
  }

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
