import { PermissionKey, Role } from "@prisma/client";
import request from "supertest";
import { app } from "./api-test-app.js";

export const endpoints = [
  ["GET", "/api/health"],
  ["GET", "/api/health/telegram"],
  ["POST", "/api/auth/register"],
  ["POST", "/api/auth/login"],
  ["POST", "/api/auth/refresh"],
  ["POST", "/api/auth/logout"],
  ["GET", "/api/auth/me"],
  ["GET", "/api/boards"],
  ["POST", "/api/boards"],
  ["GET", "/api/boards/:boardId"],
  ["GET", "/api/boards/:boardId/archive"],
  ["PATCH", "/api/boards/:boardId/layout"],
  ["POST", "/api/boards/cards/:cardId/restore"],
  ["PATCH", "/api/boards/:boardId"],
  ["DELETE", "/api/boards/:boardId"],
  ["GET", "/api/boards/:boardId/access"],
  ["POST", "/api/boards/:boardId/access"],
  ["DELETE", "/api/boards/:boardId/access/:userId"],
  ["POST", "/api/boards/:boardId/columns"],
  ["PATCH", "/api/boards/columns/:columnId"],
  ["DELETE", "/api/boards/columns/:columnId"],
  ["POST", "/api/boards/columns/:columnId/move"],
  ["POST", "/api/boards/columns/:columnId/cards"],
  ["PATCH", "/api/boards/cards/:cardId"],
  ["DELETE", "/api/boards/cards/:cardId"],
  ["POST", "/api/boards/cards/:cardId/archive"],
  ["POST", "/api/boards/cards/:cardId/move"],
  ["GET", "/api/components"],
  ["POST", "/api/components"],
  ["PATCH", "/api/components/:id"],
  ["GET", "/api/departments"],
  ["POST", "/api/departments"],
  ["PATCH", "/api/departments/:id"],
  ["GET", "/api/knowledge/sections"],
  ["POST", "/api/knowledge/sections"],
  ["PATCH", "/api/knowledge/sections/:id"],
  ["DELETE", "/api/knowledge/sections/:id"],
  ["POST", "/api/knowledge/import"],
  ["GET", "/api/knowledge/articles"],
  ["POST", "/api/knowledge/articles"],
  ["GET", "/api/knowledge/articles/:id"],
  ["PATCH", "/api/knowledge/articles/:id"],
  ["DELETE", "/api/knowledge/articles/:id"],
  ["POST", "/api/knowledge/articles/:id/attachments"],
  ["GET", "/api/knowledge/attachments/:id/download"],
  ["DELETE", "/api/knowledge/attachments/:id"],
  ["GET", "/api/moderation/users"],
  ["GET", "/api/moderation/organizations"],
  ["GET", "/api/moderation/stores"],
  ["PATCH", "/api/moderation/users/:id"],
  ["PATCH", "/api/moderation/organizations/:id"],
  ["PATCH", "/api/moderation/stores/:id"],
  ["GET", "/api/organizations"],
  ["POST", "/api/organizations"],
  ["PATCH", "/api/organizations/:id"],
  ["DELETE", "/api/organizations/:id"],
  ["PUT", "/api/organizations/:id/members"],
  ["POST", "/api/organizations/:id/approve"],
  ["POST", "/api/organizations/:id/reject"],
  ["POST", "/api/recurring-requests/:id/stop"],
  ["GET", "/api/request-types"],
  ["POST", "/api/request-types"],
  ["PATCH", "/api/request-types/:id"],
  ["GET", "/api/requests/assignees"],
  ["GET", "/api/requests"],
  ["GET", "/api/requests/stats"],
  ["GET", "/api/requests/procurement"],
  ["POST", "/api/requests"],
  ["PATCH", "/api/requests/:id"],
  ["DELETE", "/api/requests/:id"],
  ["POST", "/api/requests/:id/assignees/self"],
  ["DELETE", "/api/requests/:id/assignees/self"],
  ["POST", "/api/requests/:id/comments"],
  ["GET", "/api/staff"],
  ["POST", "/api/staff"],
  ["PATCH", "/api/staff/:id"],
  ["PUT", "/api/staff/:id/access"],
  ["PATCH", "/api/staff/:id/password"],
  ["POST", "/api/staff/:id/telegram-link"],
  ["GET", "/api/stores"],
  ["POST", "/api/stores"],
  ["PATCH", "/api/stores/:id"],
  ["DELETE", "/api/stores/:id"],
  ["GET", "/api/stores/:id/access"],
  ["PUT", "/api/stores/:id/access"],
  ["POST", "/api/stores/:id/approve"],
  ["POST", "/api/stores/:id/reject"],
  ["GET", "/api/telegram/integrations"],
  ["GET", "/api/telegram/chats"],
  ["GET", "/api/telegram/chats/:id/messages"],
  ["PATCH", "/api/telegram/chats/:id/link"],
  ["PUT", "/api/telegram/chats/:id/links"],
  ["POST", "/api/telegram/chats/:id/messages"],
  ["GET", "/api/users"],
  ["POST", "/api/users"],
  ["PATCH", "/api/users/:id/status"],
  ["PATCH", "/api/users/:id/password"],
] as const;

export type Endpoint = (typeof endpoints)[number];

export const permissionGates: Array<{
  permission: PermissionKey;
  endpoints: Endpoint[];
  roles: Role[];
}> = [
  {
    permission: PermissionKey.MANAGE_TEMPLATES,
    endpoints: endpoints.filter(
      ([, path]) =>
        (path.startsWith("/api/components") && path !== "/api/components") ||
        (path.startsWith("/api/request-types") &&
          path !== "/api/request-types"),
    ),
    roles: [Role.DIRECTOR, Role.DEPARTMENT_HEAD],
  },
  {
    permission: PermissionKey.MANAGE_STAFF,
    endpoints: endpoints.filter(
      ([method, path]) =>
        path.startsWith("/api/staff") ||
        (path === "/api/departments" && method !== "GET"),
    ),
    roles: [Role.DIRECTOR],
  },
  {
    permission: PermissionKey.MANAGE_CLIENTS,
    endpoints: endpoints.filter(
      ([, path]) =>
        path.startsWith("/api/users") || path.startsWith("/api/moderation"),
    ),
    roles: [Role.DIRECTOR],
  },
  {
    permission: PermissionKey.MANAGE_KNOWLEDGE,
    endpoints: endpoints.filter(([, path]) =>
      path.startsWith("/api/knowledge"),
    ),
    roles: [Role.DIRECTOR, Role.DEPARTMENT_HEAD, Role.MASTER],
  },
  {
    permission: PermissionKey.VIEW_TELEGRAM,
    endpoints: endpoints.filter(([, path]) => path.startsWith("/api/telegram")),
    roles: [Role.DIRECTOR, Role.DEPARTMENT_HEAD, Role.MASTER],
  },
  {
    permission: PermissionKey.VIEW_REPORTS,
    endpoints: endpoints.filter(
      ([, path]) =>
        path === "/api/requests/stats" || path === "/api/requests/procurement",
    ),
    roles: [Role.DIRECTOR, Role.DEPARTMENT_HEAD, Role.MASTER],
  },
  {
    permission: PermissionKey.DELETE_ORGANIZATIONS,
    endpoints: [["DELETE", "/api/organizations/:id"]],
    roles: [Role.DIRECTOR],
  },
  {
    permission: PermissionKey.DELETE_STORES,
    endpoints: [["DELETE", "/api/stores/:id"]],
    roles: [Role.DIRECTOR],
  },
  {
    permission: PermissionKey.DELETE_REQUESTS,
    endpoints: [["DELETE", "/api/requests/:id"]],
    roles: [Role.DIRECTOR],
  },
];

export function send(endpoint: readonly [Endpoint[0], string], token?: string) {
  const [method, route] = endpoint;
  const path = route.replace(/:[A-Za-z]+/g, "999999999");
  const target = path === "/api/boards" ? `${path}?type=PERSONAL` : path;
  const client = request(app);
  const pending =
    method === "GET"
      ? client.get(target)
      : method === "POST"
        ? client.post(target)
        : method === "PUT"
          ? client.put(target)
          : method === "PATCH"
            ? client.patch(target)
            : client.delete(target);

  if (token) pending.set("Authorization", `Bearer ${token}`);
  if (method !== "GET" && method !== "DELETE") pending.send({});
  return pending;
}
