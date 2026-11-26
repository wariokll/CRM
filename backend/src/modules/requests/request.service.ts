import {
  CommentVisibility,
  PermissionKey,
  Priority,
  RequestSource,
  RequestStatus,
  Role,
  Urgency,
  type Prisma,
} from "@prisma/client";
import type { RequestAssigneeDTO } from "@crm/shared-types";
import { z } from "zod";
import { canChangeRequestStatus } from "../../utils/request-status.js";
import {
  moveToPreviousBusinessDay,
  nextRecurringDate,
} from "../../utils/business-days.js";
import { prisma } from "../../db.js";
import { requestAssigneeDtoSchema } from "../../shared/response-schemas.js";
import {
  getUserAccess,
  hasPermission,
  type UserAccess,
} from "../../shared/middleware/authorization.js";
import { canManageRequest, requestVisibilityWhere } from "./request-policy.js";
import { requestInclude } from "./request.include.js";
import {
  createRequestSchema,
  updateRequestSchema,
  validateRequiredTemplateFields,
} from "./request.contracts.js";
import {
  notifyRequestAssignees,
  notifyRequestClient,
} from "../../utils/telegram-notifications.js";

export class RequestServiceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function listRequestAssignees(departmentId?: number) {
  const assignees = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { role: Role.DIRECTOR },
        {
          role: { in: [Role.MASTER, Role.DEPARTMENT_HEAD] },
          ...(departmentId && {
            departmentMemberships: { some: { departmentId } },
          }),
        },
      ],
    },
    select: {
      id: true,
      ipName: true,
      email: true,
      role: true,
      departmentMemberships: { include: { department: true } },
    },
    orderBy: { ipName: "asc" },
  });
  return assignees.map((assignee) =>
    requestAssigneeDtoSchema.parse(assignee),
  ) satisfies RequestAssigneeDTO[];
}

export interface RequestListFilters {
  urgency?: Urgency;
  status?: RequestStatus;
  priority?: Priority;
  storeId?: number;
  typeId?: number;
  departmentId?: number;
  search: string;
}

export async function listRequests(
  access: UserAccess,
  filters: RequestListFilters,
) {
  const rows = await prisma.request.findMany({
    where: {
      AND: [requestVisibilityWhere(access)],
      ...(filters.urgency && { urgency: filters.urgency }),
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.storeId && { storeId: filters.storeId }),
      ...(filters.typeId && { typeId: filters.typeId }),
      ...(filters.departmentId && { departmentId: filters.departmentId }),
      ...(filters.search && {
        OR: [
          { description: { contains: filters.search } },
          { store: { name: { contains: filters.search } } },
          { store: { address: { contains: filters.search } } },
          { organization: { legalName: { contains: filters.search } } },
          { createdBy: { ipName: { contains: filters.search } } },
        ],
      }),
    },
    include: requestInclude,
    orderBy: [
      { priority: "desc" },
      { scheduledAt: "asc" },
      { createdAt: "desc" },
    ],
  });
  return rows.map((row) =>
    access.role === Role.CLIENT
      ? {
          ...row,
          comments: row.comments.filter(
            (comment) => comment.visibility === CommentVisibility.CLIENT,
          ),
        }
      : row,
  );
}

export async function deleteRequest(access: UserAccess | null, id: number) {
  if (
    !access ||
    access.status !== "ACTIVE" ||
    !hasPermission(access, PermissionKey.DELETE_REQUESTS)
  )
    return {
      status: 403 as const,
      body: { message: "Недостаточно прав для удаления заявок" },
    };
  const request = await prisma.request.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!request)
    return { status: 404 as const, body: { message: "Заявка не найдена" } };
  await prisma.request.delete({ where: { id } });
  return { status: 204 as const };
}

export async function selfAssignRequest(access: UserAccess | null, id: number) {
  if (!access || access.role === Role.CLIENT)
    return {
      status: 403 as const,
      body: { message: "Недостаточно прав" },
    };
  const row = await prisma.request.findUnique({
    where: { id },
    select: { departmentId: true, type: { select: { name: true } } },
  });
  if (!row || !access.departmentIds.includes(row.departmentId))
    return {
      status: 404 as const,
      body: { message: "Заявка вашего отдела не найдена" },
    };
  await prisma.requestAssignee.upsert({
    where: { requestId_userId: { requestId: id, userId: access.userId } },
    create: {
      requestId: id,
      userId: access.userId,
      assignedByUserId: access.userId,
    },
    update: {},
  });
  await prisma.requestActivity.create({
    data: {
      requestId: id,
      authorUserId: access.userId,
      kind: "SELF_ASSIGNED",
      message: "Мастер взял заявку в работу",
    },
  });
  void notifyRequestAssignees(
    id,
    `Вы взяли в работу заявку «${row.type.name}».`,
    [access.userId],
  );
  return { status: 204 as const };
}

export async function selfUnassignRequest(userId: number, id: number) {
  await prisma.requestAssignee.deleteMany({
    where: { requestId: id, userId },
  });
}

export async function addRequestComment(
  access: UserAccess | null,
  id: number,
  input: unknown,
) {
  if (!access)
    return {
      status: 401 as const,
      body: { message: "Пользователь не найден" },
    };
  const row = await prisma.request.findFirst({
    where: { id, AND: [requestVisibilityWhere(access)] },
  });
  if (!row)
    return { status: 404 as const, body: { message: "Заявка не найдена" } };
  const body = z
    .object({
      body: z.string().trim().min(1).max(5000),
      visibility: z
        .nativeEnum(CommentVisibility)
        .default(CommentVisibility.CLIENT),
    })
    .parse(input);
  if (
    access.role === Role.CLIENT &&
    body.visibility !== CommentVisibility.CLIENT
  )
    return {
      status: 403 as const,
      body: { message: "Недостаточно прав" },
    };
  const comment = await prisma.requestComment.create({
    data: {
      requestId: id,
      authorUserId: access.userId,
      visibility: body.visibility,
      body: body.body,
    },
    include: { author: { select: { id: true, ipName: true, role: true } } },
  });
  await prisma.requestActivity.create({
    data: {
      requestId: id,
      authorUserId: access.userId,
      kind: "COMMENT_ADDED",
      message:
        body.visibility === CommentVisibility.INTERNAL
          ? "Добавлен внутренний комментарий"
          : "Добавлен комментарий для клиента",
    },
  });
  if (
    access.role !== Role.CLIENT &&
    comment.visibility === CommentVisibility.CLIENT
  )
    void notifyRequestClient(
      id,
      `Новый комментарий по заявке #${id} от ${comment.author.ipName}:\n${comment.body}`,
    );
  return { status: 201 as const, body: comment };
}

export async function createRequest(userId: number, input: unknown) {
  const body = createRequestSchema.parse(input);
  const access = await getUserAccess(userId);
  if (!access || access.status !== "ACTIVE")
    throw new RequestServiceError(403, "Аккаунт ещё не одобрен");
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
  if (access.role === Role.CLIENT && requestedDepartment !== type.departmentId)
    throw new RequestServiceError(403, "Отдел определяется шаблоном заявки");
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
  const request = await prisma.$transaction(async (transaction) => {
    const recurrenceSchedule =
      body.recurrenceIntervalDays && scheduledAt
        ? await transaction.recurringRequestSchedule.create({
            data: {
              storeId: store?.id ?? null,
              organizationId,
              createdByUserId,
              typeId: type.id,
              departmentId: requestedDepartment,
              priority,
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
    const created = await transaction.request.create({
      data: {
        storeId: store?.id ?? null,
        organizationId,
        createdByUserId,
        typeId: type.id,
        departmentId: requestedDepartment,
        urgency: body.urgency,
        priority,
        source: body.source ?? RequestSource.WEB,
        scheduledAt,
        description: body.description,
        templateData: body.templateData as Prisma.InputJsonValue | undefined,
        componentsData: componentsData as Prisma.InputJsonValue | undefined,
        recurrenceScheduleId: recurrenceSchedule?.id,
      },
    });
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
    return transaction.request.findUniqueOrThrow({
      where: { id: created.id },
      include: requestInclude,
    });
  });
  if (assignee)
    void notifyRequestAssignees(
      request.id,
      `Вам назначена новая заявка «${type.name}». Откройте БАЗИС CRM для деталей.`,
      [assignee.id],
    );
  return request;
}

export async function updateRequest(
  userId: number,
  id: number,
  input: unknown,
) {
  const access = await getUserAccess(userId);
  if (!access || access.role === Role.CLIENT)
    throw new RequestServiceError(403, "Недостаточно прав");
  const row = await prisma.request.findFirst({
    where: { id, AND: [requestVisibilityWhere(access)] },
    include: { assignees: true, type: { select: { name: true } } },
  });
  if (!row) throw new RequestServiceError(404, "Заявка не найдена");
  const update = updateRequestSchema.parse(input);
  const managesCurrent = canManageRequest(access, row.departmentId);
  const isAssignedMaster =
    access.role === Role.MASTER &&
    row.assignees.some((assignee) => assignee.userId === access.userId);
  if (!managesCurrent && !isAssignedMaster)
    throw new RequestServiceError(
      403,
      "Сначала возьмите заявку в работу: сейчас доступен просмотр и комментарии",
    );
  if (update.status) {
    if (
      update.status === RequestStatus.CANCELLED &&
      !hasPermission(access, PermissionKey.CANCEL_REQUESTS)
    )
      throw new RequestServiceError(
        403,
        "Отменить заявку может руководитель или начальник отдела",
      );
    if (!canChangeRequestStatus(row.status, update.status))
      throw new RequestServiceError(400, "Недопустимый переход статуса");
  }
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

  await prisma.$transaction(async (transaction) => {
    const nextDepartmentId = update.departmentId ?? row.departmentId;
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
    if (update.assigneeIds) {
      const ids = [...new Set(update.assigneeIds)];
      const eligible = await transaction.user.findMany({
        where: {
          id: { in: ids },
          status: "ACTIVE",
          OR: [
            { role: Role.DIRECTOR },
            {
              role: { in: [Role.MASTER, Role.DEPARTMENT_HEAD] },
              departmentMemberships: {
                some: { departmentId: nextDepartmentId },
              },
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
      await transaction.requestActivity.create({
        data: {
          requestId: row.id,
          authorUserId: access.userId,
          kind: "STATUS_CHANGED",
          message: `Статус изменён: «${statusLabels[row.status]}» → «${statusLabels[update.status]}»`,
        },
      });
    if (update.priority && update.priority !== row.priority)
      await transaction.requestActivity.create({
        data: {
          requestId: row.id,
          authorUserId: access.userId,
          kind: "PRIORITY_CHANGED",
          message: `Приоритет изменён: «${priorityLabels[row.priority]}» → «${priorityLabels[update.priority]}»`,
        },
      });
    if (update.departmentId && update.departmentId !== row.departmentId)
      await transaction.requestActivity.create({
        data: {
          requestId: row.id,
          authorUserId: access.userId,
          kind: "DEPARTMENT_CHANGED",
          message: "Заявка передана в другой отдел",
        },
      });
    if (update.assigneeIds)
      await transaction.requestActivity.create({
        data: {
          requestId: row.id,
          authorUserId: access.userId,
          kind: "ASSIGNEES_CHANGED",
          message: update.assigneeIds.length
            ? "Исполнители обновлены"
            : "Исполнители сняты с заявки",
        },
      });
    if (update.adminComment?.trim())
      await transaction.requestComment.create({
        data: {
          requestId: row.id,
          authorUserId: access.userId,
          visibility: CommentVisibility.CLIENT,
          body: update.adminComment.trim(),
        },
      });
  });
  if (update.status && update.status !== row.status) {
    const labels: Record<RequestStatus, string> = {
      NEW: "Новая",
      ACCEPTED: "Принята",
      IN_PROGRESS: "В работе",
      DONE: "Выполнена",
      CANCELLED: "Отменена",
    };
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
  return prisma.request.findUniqueOrThrow({
    where: { id: row.id },
    include: requestInclude,
  });
}
