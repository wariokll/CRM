import { CommentVisibility, PermissionKey, Role } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { RequestAssigneeDTO } from "@crm/shared-types";
import { z } from "zod";
import { requestAssigneeDtoSchema } from "../../shared/response-schemas.js";
import {
  hasPermission,
  type UserAccess,
} from "../../shared/middleware/authorization.js";
import { requestVisibilityWhere } from "./request-policy.js";
import { requestInclude } from "./request.include.js";
import { createTelegramNotifications } from "../../utils/telegram-notifications.js";
import type { RequestListFilters } from "./request.types.js";

export function createRequestReadService(prisma: PrismaClient) {
  const { notifyRequestAssignees, notifyRequestClient } =
    createTelegramNotifications(prisma);
  async function listRequestAssignees(departmentId?: number) {
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

  async function listRequests(access: UserAccess, filters: RequestListFilters) {
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

  async function deleteRequest(access: UserAccess | null, id: number) {
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

  async function selfAssignRequest(access: UserAccess | null, id: number) {
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

  async function selfUnassignRequest(userId: number, id: number) {
    await prisma.requestAssignee.deleteMany({
      where: { requestId: id, userId },
    });
  }

  async function saveRequestComment(
    access: UserAccess,
    id: number,
    body: { body: string; visibility: CommentVisibility },
  ) {
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
    return comment;
  }

  async function addRequestComment(
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
    const comment = await saveRequestComment(access, id, body);

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

  return {
    listRequestAssignees,
    listRequests,
    deleteRequest,
    selfAssignRequest,
    selfUnassignRequest,
    addRequestComment,
  };
}
