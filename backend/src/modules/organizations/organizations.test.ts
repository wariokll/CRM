import {
  OrganizationStatus,
  OrganizationType,
  Role,
  UserStatus,
} from "@prisma/client";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({ prisma, requestLogger: (_req, _res, next) => next() });
const suffix = `${Date.now()}`;
const userIds: number[] = [];
const organizationIds: number[] = [];
async function user(role: Role) {
  const created = await prisma.user.create({
    data: {
      ipName: `Org ${role}`,
      email: `org-${role}-${suffix}-${userIds.length}@example.test`,
      passwordHash: "unused",
      phone: `+700${suffix.slice(-8)}${userIds.length}`,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(created.id);
  return { created, token: createAccessToken({ userId: created.id, role }) };
}
afterAll(async () => {
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (organizationIds.length)
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
});

describe("organization endpoint behavior", () => {
  it("creates pending client organizations and lists only the client's memberships", async () => {
    const client = await user(Role.CLIENT);
    const response = await request(app)
      .post("/api/organizations")
      .set("Authorization", `Bearer ${client.token}`)
      .send({
        type: OrganizationType.IP,
        legalName: `Org ${suffix}`,
        contacts: [],
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe(OrganizationStatus.PENDING);
    organizationIds.push(response.body.id);
    const list = await request(app)
      .get("/api/organizations")
      .set("Authorization", `Bearer ${client.token}`);
    expect(list.status).toBe(200);
    expect(
      list.body.map((organization: { id: number }) => organization.id),
    ).toContain(response.body.id);
  });

  it("requires an active employee to delete an organization", async () => {
    const client = await user(Role.CLIENT);
    const response = await request(app)
      .delete("/api/organizations/999999999")
      .set("Authorization", `Bearer ${client.token}`);
    expect(response.status).toBe(403);
  });
});
