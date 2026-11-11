import { Role, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({ prisma, requestLogger: (_req, _res, next) => next() });
const suffix = `${Date.now()}`;
const componentIds: number[] = [];
const userIds: number[] = [];
let userSequence = 0;

async function createTestUser(role: Role) {
  userSequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: `Components ${role}`,
      email: `components-${role.toLowerCase()}-${suffix}-${userSequence}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7555${suffix.slice(-7)}${userSequence}`,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(user.id);
  return createAccessToken({ userId: user.id, role });
}

afterAll(async () => {
  if (componentIds.length)
    await prisma.component.deleteMany({ where: { id: { in: componentIds } } });
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("components endpoint behavior", () => {
  it("creates a trimmed component and updates its name and active state", async () => {
    const token = await createTestUser(Role.DIRECTOR);
    const created = await request(app)
      .post("/api/components")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `  Component ${suffix}  ` });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: `Component ${suffix}`,
      isActive: true,
    });
    componentIds.push(created.body.id);

    const updated = await request(app)
      .patch(`/api/components/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Updated ${suffix}`, isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: created.body.id,
      name: `Updated ${suffix}`,
      isActive: false,
    });
  });

  it("denies catalog changes to roles without MANAGE_TEMPLATES", async () => {
    const token = await createTestUser(Role.CLIENT);
    const response = await request(app)
      .post("/api/components")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Forbidden component ${suffix}` });

    expect(response.status).toBe(403);
    expect(response.body.message).toEqual(expect.any(String));
  });
});
