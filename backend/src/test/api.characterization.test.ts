import { PermissionKey, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../db.js";
import { createDepartment, createUser } from "./factories.js";

const app = createApp({
  prisma,
  requestLogger: (_req, _res, next) => next(),
});

const endpoints = [
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

type Endpoint = (typeof endpoints)[number];

const permissionGates: Array<{
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

function send(endpoint: Endpoint, token?: string) {
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

async function clearDatabase() {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    try {
      const tables = await transaction.$queryRaw<Array<{ TABLE_NAME: string }>>`
        SELECT TABLE_NAME FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME <> '_prisma_migrations'
      `;
      for (const { TABLE_NAME } of tables) {
        if (!/^[A-Za-z0-9_]+$/.test(TABLE_NAME))
          throw new Error(`Unexpected test table name: ${TABLE_NAME}`);
        await transaction.$executeRawUnsafe(`DELETE FROM \`${TABLE_NAME}\``);
      }
    } finally {
      await transaction.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    }
  });
}

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("API characterization", () => {
  it("keeps the health response and public auth endpoint behavior", async () => {
    await expect(request(app).get("/api/health")).resolves.toMatchObject({
      status: 200,
      body: { ok: true, database: true },
    });
    await expect(
      request(app).get("/api/health/telegram"),
    ).resolves.toMatchObject({
      status: 200,
      body: { ok: true, configured: false, status: "DISABLED" },
    });
    await expect(
      request(app).post("/api/auth/register").send({}),
    ).resolves.toMatchObject({
      status: 400,
      body: { issues: expect.any(Array) },
    });
    await expect(
      request(app).post("/api/auth/login").send({}),
    ).resolves.toMatchObject({
      status: 400,
      body: { issues: expect.any(Array) },
    });
    await expect(request(app).post("/api/auth/refresh")).resolves.toMatchObject(
      {
        status: 401,
        body: { message: expect.any(String) },
      },
    );
    await expect(request(app).post("/api/auth/logout")).resolves.toMatchObject({
      status: 204,
    });
    const currentUserWithoutToken = await request(app).get("/api/auth/me");
    expect({
      status: currentUserWithoutToken.status,
      body: currentUserWithoutToken.body,
    }).toMatchInlineSnapshot(`
      {
        "body": {
          "message": "Требуется авторизация",
        },
        "status": 401,
      }
    `);
  });

  it("preserves registration, login, refresh cookie, logout, and current-user responses", async () => {
    const email = "registration-characterization@example.test";
    const registration = await request(app)
      .post("/api/auth/register")
      .send({
        ipName: "ИП Test Baseline",
        email,
        password: "BaselinePassword123",
        phone: "+70000000123",
        store: {
          name: "Тестовая точка",
          address: "г. Москва, тестовый адрес",
          phone: "+70000000124",
        },
      });
    expect(registration.status).toBe(201);
    expect(registration.body.user).toMatchObject({
      email,
      role: Role.CLIENT,
      status: "PENDING",
    });
    expect({
      status: registration.status,
      message: registration.body.message,
      user: {
        email: registration.body.user.email,
        ipName: registration.body.user.ipName,
        phone: registration.body.user.phone,
        role: registration.body.user.role,
        status: registration.body.user.status,
        permissionOverrides: registration.body.user.permissionOverrides,
        departmentMemberships: registration.body.user.departmentMemberships,
        organizationCount: registration.body.user.organizations.length,
      },
    }).toMatchInlineSnapshot(`
      {
        "message": "Заявка на регистрацию отправлена на модерацию",
        "status": 201,
        "user": {
          "departmentMemberships": [],
          "email": "registration-characterization@example.test",
          "ipName": "ИП Test Baseline",
          "organizationCount": 1,
          "permissionOverrides": [],
          "phone": "+70000000123",
          "role": "CLIENT",
          "status": "PENDING",
        },
      }
    `);
    const organization = await prisma.organization.findFirstOrThrow({
      where: { email },
      select: { type: true },
    });
    expect(organization.type).toBe("OTHER");

    const password = "LoginPassword123";
    const created = await createUser(Role.DIRECTOR);
    await prisma.user.update({
      where: { id: created.user.id },
      data: { passwordHash: await bcrypt.hash(password, 4) },
    });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: created.user.email, password });
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({
      accessToken: expect.any(String),
      user: {
        id: created.user.id,
        email: created.user.email,
        role: Role.DIRECTOR,
        status: "ACTIVE",
      },
    });
    expect(String(login.headers["set-cookie"])).toContain("refreshToken=");

    const accessToken = login.body.accessToken as string;
    const currentUser = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(currentUser.status).toBe(200);
    expect(currentUser.body).toMatchObject({
      id: created.user.id,
      email: created.user.email,
      role: Role.DIRECTOR,
    });

    const cookie = String(login.headers["set-cookie"])
      .split(",")[0]
      .split(";")[0];
    const refresh = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookie);
    expect(refresh.status).toBe(200);
    expect(refresh.body).toMatchObject({
      accessToken: expect.any(String),
      user: { id: created.user.id, email: created.user.email },
    });

    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);
    expect(logout.status).toBe(204);
    expect(String(logout.headers["set-cookie"])).toContain("refreshToken=");
  });

  it("requires authentication on every protected registered endpoint", async () => {
    const protectedEndpoints = endpoints.filter(
      ([, path]) =>
        !path.startsWith("/api/health") &&
        !/^\/api\/auth\/(register|login|refresh|logout)$/.test(path),
    );

    expect(protectedEndpoints).toHaveLength(91);
    for (const endpoint of protectedEndpoints) {
      const response = await send(endpoint);
      expect(response.status, `${endpoint[0]} ${endpoint[1]}`).toBe(401);
    }
  });

  it.each(Object.values(Role))(
    "records endpoint responses for %s using an empty or default request",
    async (role) => {
      const { token } = await createUser(role);
      const outcomes: Array<[string, number]> = [];
      for (const endpoint of endpoints) {
        const [, path] = endpoint;
        if (
          path.startsWith("/api/health") ||
          /^\/api\/auth\/(register|login|refresh|logout)$/.test(path)
        ) {
          continue;
        }
        const response = await send(endpoint, token);
        expect(response.status, `${role} ${endpoint[0]} ${path}`).toBeLessThan(
          500,
        );
        outcomes.push([`${endpoint[0]} ${path}`, response.status]);
      }
      expect(outcomes).toMatchSnapshot();
    },
  );

  it("preserves role and permission behavior for shared catalog endpoints", async () => {
    const users = new Map<Role, string>();
    for (const role of Object.values(Role)) {
      users.set(role, (await createUser(role)).token);
    }

    for (const role of Object.values(Role)) {
      const token = users.get(role)!;
      const catalog = await send(["GET", "/api/components"], token);
      const departments = await send(["GET", "/api/departments"], token);
      expect(catalog.status, `${role} components`).toBe(200);
      expect(departments.status, `${role} departments`).toBe(200);
    }

    const createdComponent = await send(
      ["POST", "/api/components"],
      users.get(Role.DIRECTOR),
    ).send({ name: "Тестовый компонент" });
    expect(createdComponent.status).toBe(201);
    expect(createdComponent.body.name).toBe("Тестовый компонент");

    for (const role of [Role.MASTER, Role.CLIENT]) {
      const response = await send(
        ["POST", "/api/components"],
        users.get(role),
      ).send({
        name: "Запрещённый компонент",
      });
      expect(response.status, `${role} cannot manage templates`).toBe(403);
    }

    const director = users.get(Role.DIRECTOR)!;
    const departmentHead = await createUser(Role.DEPARTMENT_HEAD);
    const allowedDepartmentHead = await send(
      ["POST", "/api/components"],
      departmentHead.token,
    ).send({ name: "Доступный компонент" });
    expect(allowedDepartmentHead.status).toBe(201);

    const department = await createDepartment("Сервисный", "service-test");
    const createdType = await send(
      ["POST", "/api/request-types"],
      director,
    ).send({
      name: "Тестовый тип",
      departmentId: department.id,
    });
    expect(createdType.status).toBe(201);
    expect(createdType.body).toMatchObject({
      name: "Тестовый тип",
      departmentId: department.id,
      requiresOrganization: true,
      requiresStore: true,
      templateFields: [],
    });
  });

  it("keeps default permission gates and endpoint scopes for every staff role", async () => {
    const users = new Map<Role, string>();
    for (const role of Object.values(Role)) {
      users.set(role, (await createUser(role)).token);
    }

    for (const gate of permissionGates) {
      for (const endpoint of gate.endpoints) {
        for (const role of Object.values(Role)) {
          const response = await send(endpoint, users.get(role));
          if (gate.roles.includes(role)) {
            expect(
              response.status,
              `${role} should pass ${gate.permission} at ${endpoint.join(" ")}`,
            ).not.toBe(403);
          } else {
            expect(
              response.status,
              `${role} should be denied ${gate.permission} at ${endpoint.join(" ")}`,
            ).toBe(403);
          }
        }
      }
    }
  });

  it("returns scoped report access according to the current role defaults", async () => {
    for (const role of [Role.DIRECTOR, Role.DEPARTMENT_HEAD, Role.MASTER]) {
      const { token } = await createUser(role);
      const response = await send(["GET", "/api/requests/stats"], token);
      expect(response.status, `${role} report access`).toBe(200);
    }

    const client = await createUser(Role.CLIENT);
    const denied = await send(["GET", "/api/requests/stats"], client.token);
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ message: expect.any(String) });
  });
});
