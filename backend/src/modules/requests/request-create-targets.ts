import { PermissionKey, Role, Urgency } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { moveToPreviousBusinessDay } from "../../utils/business-days.js";
import {
  hasPermission,
  type UserAccess,
} from "../../shared/middleware/authorization.js";
import { validateRequiredTemplateFields } from "./request.contracts.js";
import { RequestServiceError } from "./request.errors.js";
import type {
  ActiveRequestType,
  RequestCreationBody,
} from "./request-create.types.js";

export function createRequestTargetService(prisma: PrismaClient) {
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
  return {
    resolveRequestComponentsAndDepartment,
    validateRequestSchedule,
    resolveRequestTarget,
    resolveRequestAssignee,
    prepareRequestMetadata,
  };
}
