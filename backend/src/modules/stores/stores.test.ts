import {
  OrganizationStatus,
  OrganizationType,
  Role,
  StoreStatus,
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
let sequence = 0;
async function createClient() {
  sequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: "Store test client",
      email: `store-client-${suffix}-${sequence}@example.test`,
      passwordHash: "unused",
      phone: `+700${suffix.slice(-7)}${sequence}`,
      role: Role.CLIENT,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(user.id);
  const organization = await prisma.organization.create({
    data: {
      type: OrganizationType.IP,
      legalName: `Store org ${suffix}`,
      status: OrganizationStatus.ACTIVE,
      createdByUserId: user.id,
      members: { create: { userId: user.id, isPrimary: true } },
    },
  });
  organizationIds.push(organization.id);
  return {
    user,
    organization,
    token: createAccessToken({ userId: user.id, role: user.role }),
  };
}
afterAll(async () => {
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (organizationIds.length)
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
});

describe("store endpoint behavior", () => {
  it("creates a pending store for an organization member and returns its primary user", async () => {
    const client = await createClient();
    const response = await request(app)
      .post("/api/stores")
      .set("Authorization", `Bearer ${client.token}`)
      .send({
        organizationId: client.organization.id,
        name: `Store ${suffix}`,
        address: "Test street 1",
      });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: StoreStatus.PENDING,
      user: { id: client.user.id },
    });
  });

  it("hides stores from a client who is not an organization member", async () => {
    const client = await createClient();
    const other = await prisma.user.create({
      data: {
        ipName: "Other client",
        email: `store-other-${suffix}@example.test`,
        passwordHash: "unused",
        phone: `+701${suffix.slice(-8)}`,
        role: Role.CLIENT,
        status: UserStatus.ACTIVE,
      },
    });
    const token = createAccessToken({ userId: other.id, role: other.role });
    const response = await request(app)
      .get("/api/stores")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    await prisma.user.delete({ where: { id: other.id } });
    void client;
  });
});
