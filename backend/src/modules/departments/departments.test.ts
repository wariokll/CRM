import { Role, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({ prisma, requestLogger: (_req, _res, next) => next() });
const suffix = `${Date.now()}`;
const departmentIds: number[] = [];
const userIds: number[] = [];
let userSequence = 0;

async function createTestUser(role: Role) {
  userSequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: `Department ${role}`,
      email: `department-${role.toLowerCase()}-${suffix}-${userSequence}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7666${suffix.slice(-7)}${userSequence}`,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(user.id);
  return createAccessToken({ userId: user.id, role });
}

afterAll(async () => {
  if (departmentIds.length)
    await prisma.department.deleteMany({
      where: { id: { in: departmentIds } },
    });
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("departments endpoint behavior", () => {
  it("creates a trimmed department and patches its name and active state", async () => {
    const token = await createTestUser(Role.DIRECTOR);
    const created = await request(app)
      .post("/api/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  Service Ops  ", slug: `service-${suffix}` });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: "Service Ops",
      slug: `service-${suffix}`,
      isActive: true,
    });
    departmentIds.push(created.body.id);

    const updated = await request(app)
      .patch(`/api/departments/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  Field Service  ", isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: created.body.id,
      name: "Field Service",
      slug: `service-${suffix}`,
      isActive: false,
    });
  });

  it("allows authenticated users to list departments", async () => {
    const token = await createTestUser(Role.CLIENT);
    const response = await request(app)
      .get("/api/departments")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.every((department: { name: string }) => department.name),
    ).toBe(true);
  });

  it("denies department management to roles without MANAGE_STAFF", async () => {
    const token = await createTestUser(Role.CLIENT);
    const response = await request(app)
      .post("/api/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Forbidden Department", slug: `forbidden-${suffix}` });

    expect(response.status).toBe(403);
    expect(response.body.message).toEqual(expect.any(String));
  });
});
