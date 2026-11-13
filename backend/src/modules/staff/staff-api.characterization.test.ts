import { Role, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db.js";
import {
  app,
  clearApiDatabase,
  createApiUser,
} from "../../test/api-test-app.js";

beforeEach(clearApiDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("staff API characterization", () => {
  it("lists, creates, updates, changes access/password, and creates a Telegram link", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const auth = { Authorization: `Bearer ${director.token}` };
    const listed = await request(app).get("/api/staff").set(auth);
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: director.user.id }),
      ]),
    );

    const created = await request(app)
      .post("/api/staff")
      .set(auth)
      .send({
        name: "API Staff",
        email: `api-staff-${Date.now()}@example.test`,
        phone: "+70000000666",
        password: "StaffPassword123",
        role: Role.MASTER,
      });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      ipName: "API Staff",
      role: Role.MASTER,
      status: UserStatus.ACTIVE,
    });
    expect(created.body.passwordHash).toBeUndefined();
    const staffId = created.body.id as number;

    const updated = await request(app)
      .patch(`/api/staff/${staffId}`)
      .set(auth)
      .send({ name: "Updated Staff", status: UserStatus.BLOCKED });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      ipName: "Updated Staff",
      status: UserStatus.BLOCKED,
    });

    const access = await request(app)
      .put(`/api/staff/${staffId}/access`)
      .set(auth)
      .send({ role: Role.DEPARTMENT_HEAD, departments: [], permissions: [] });
    expect(access.status).toBe(200);
    expect(access.body.role).toBe(Role.DEPARTMENT_HEAD);

    const password = await request(app)
      .patch(`/api/staff/${staffId}/password`)
      .set(auth)
      .send({ password: "NewStaffPassword123" });
    expect(password.status).toBe(204);

    const telegramLink = await request(app)
      .post(`/api/staff/${staffId}/telegram-link`)
      .set(auth);
    expect(telegramLink.status).toBe(404);

    const reactivate = await request(app)
      .patch(`/api/staff/${staffId}`)
      .set(auth)
      .send({ status: UserStatus.ACTIVE });
    expect(reactivate.status).toBe(200);
    const activeTelegramLink = await request(app)
      .post(`/api/staff/${staffId}/telegram-link`)
      .set(auth);
    expect(activeTelegramLink.status).toBe(200);
    expect(activeTelegramLink.body).toMatchObject({
      employee: "Updated Staff",
      deepLink: expect.stringContaining("staff_"),
      expiresAt: expect.any(String),
    });
  });

  it("rejects invalid input, unknown staff, and clients without staff access", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const auth = { Authorization: `Bearer ${director.token}` };
    const invalid = await request(app).post("/api/staff").set(auth).send({});
    expect(invalid.status).toBe(400);
    expect(invalid.body.issues).toEqual(expect.any(Array));

    const missing = await request(app)
      .patch("/api/staff/999999999")
      .set(auth)
      .send({ status: UserStatus.BLOCKED });
    expect(missing.status).toBe(404);

    const client = await createApiUser(Role.CLIENT);
    const denied = await request(app)
      .get("/api/staff")
      .set("Authorization", `Bearer ${client.token}`);
    expect(denied.status).toBe(403);
  });
});
