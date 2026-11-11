import { Role, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({ prisma, requestLogger: (_req, _res, next) => next() });
const suffix = `${Date.now()}`;
const requestTypeIds: number[] = [];
const userIds: number[] = [];
let departmentId: number;
let componentId: number;
let userSequence = 0;

async function createTestUser(role: Role) {
  userSequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: `Request types ${role}`,
      email: `request-types-${role.toLowerCase()}-${suffix}-${userSequence}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7444${suffix.slice(-7)}${userSequence}`,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(user.id);
  return createAccessToken({ userId: user.id, role });
}

beforeAll(async () => {
  const department = await prisma.department.create({
    data: { name: `Request types ${suffix}`, slug: `request-types-${suffix}` },
  });
  departmentId = department.id;
  const component = await prisma.component.create({
    data: { name: `Request types component ${suffix}` },
  });
  componentId = component.id;
});

afterAll(async () => {
  if (requestTypeIds.length)
    await prisma.requestType.deleteMany({
      where: { id: { in: requestTypeIds } },
    });
  if (componentId)
    await prisma.component.deleteMany({ where: { id: componentId } });
  if (departmentId)
    await prisma.department.deleteMany({ where: { id: departmentId } });
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("request types endpoint behavior", () => {
  it("creates defaults and replaces component requirements on patch", async () => {
    const token = await createTestUser(Role.DIRECTOR);
    const created = await request(app)
      .post("/api/request-types")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: `Template ${suffix}`,
        departmentId,
        componentRequirements: [{ componentId, quantity: 2 }],
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: `Template ${suffix}`,
      departmentId,
      requiresOrganization: true,
      requiresStore: true,
      availableOnWeb: true,
      defaultPriority: "NORMAL",
      componentRequirements: [
        { componentId, quantity: 2, component: { id: componentId } },
      ],
    });
    requestTypeIds.push(created.body.id);

    const updated = await request(app)
      .patch(`/api/request-types/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Updated template ${suffix}`, componentRequirements: [] });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: created.body.id,
      name: `Updated template ${suffix}`,
      componentRequirements: [],
    });
  });

  it("shows clients only active request types available on web", async () => {
    const active = await prisma.requestType.create({
      data: {
        name: `Web type ${suffix}`,
        departmentId,
        availableOnWeb: true,
      },
    });
    const telegramOnly = await prisma.requestType.create({
      data: {
        name: `Telegram type ${suffix}`,
        departmentId,
        availableOnWeb: false,
      },
    });
    const inactive = await prisma.requestType.create({
      data: {
        name: `Inactive type ${suffix}`,
        departmentId,
        isActive: false,
        availableOnWeb: true,
      },
    });
    requestTypeIds.push(active.id, telegramOnly.id, inactive.id);
    const token = await createTestUser(Role.CLIENT);
    const response = await request(app)
      .get("/api/request-types")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.map((item: { id: number }) => item.id)).toContain(
      active.id,
    );
    expect(response.body.map((item: { id: number }) => item.id)).not.toContain(
      telegramOnly.id,
    );
    expect(response.body.map((item: { id: number }) => item.id)).not.toContain(
      inactive.id,
    );
  });

  it("denies template writes to clients", async () => {
    const token = await createTestUser(Role.CLIENT);
    const response = await request(app)
      .post("/api/request-types")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Forbidden template", departmentId });

    expect(response.status).toBe(403);
  });
});
