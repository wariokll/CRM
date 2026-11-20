import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { app, clearApiDatabase, createApiUser } from "./api-test-app.js";

beforeEach(clearApiDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("auth API characterization", () => {
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
    const created = await createApiUser(Role.DIRECTOR);
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

    const cookieHeader = login.headers["set-cookie"];
    const firstCookie = Array.isArray(cookieHeader)
      ? cookieHeader[0]
      : cookieHeader;
    if (!firstCookie) throw new Error("Login response did not set a cookie");
    const cookie = firstCookie.split(",")[0]?.split(";")[0];
    if (!cookie) throw new Error("Login response set an empty cookie");
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
});
