import {
  OrganizationStatus,
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

async function createAdminToken() {
  sequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: "Moderation administrator",
      email: `moderation-admin-${suffix}-${sequence}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7111${suffix.slice(-7)}${sequence}`,
      role: Role.DIRECTOR,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(user.id);
  return createAccessToken({ userId: user.id, role: user.role });
}

async function createPendingClient() {
  sequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: "Pending moderation client",
      email: `moderation-client-${suffix}-${sequence}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7112${suffix.slice(-7)}${sequence}`,
      role: Role.CLIENT,
      status: UserStatus.PENDING,
    },
  });
  userIds.push(user.id);
  const organization = await prisma.organization.create({
    data: {
      legalName: `Moderation organization ${suffix}-${sequence}`,
      shortName: "Moderation",
      email: user.email,
      status: OrganizationStatus.PENDING,
      createdByUserId: user.id,
      members: { create: { userId: user.id, isPrimary: true } },
      stores: {
        create: {
          name: "Moderation store",
          address: "Moderation address",
          userId: user.id,
          status: StoreStatus.PENDING,
        },
      },
    },
    include: { stores: true },
  });
  organizationIds.push(organization.id);
  return { user, organization, store: organization.stores[0] };
}

afterAll(async () => {
  if (organizationIds.length)
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("moderation endpoint behavior", () => {
  it("activates pending organizations and stores when a client is approved", async () => {
    const token = await createAdminToken();
    const { user, organization, store } = await createPendingClient();
    const response = await request(app)
      .patch(`/api/moderation/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: UserStatus.ACTIVE });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(UserStatus.ACTIVE);
    await expect(
      prisma.organization.findUniqueOrThrow({
        where: { id: organization.id },
        select: { status: true, rejectionReason: true },
      }),
    ).resolves.toEqual({
      status: OrganizationStatus.ACTIVE,
      rejectionReason: null,
    });
    await expect(
      prisma.store.findUniqueOrThrow({
        where: { id: store.id },
        select: { status: true, rejectionReason: true },
      }),
    ).resolves.toEqual({ status: StoreStatus.ACTIVE, rejectionReason: null });
  });

  it("requires and stores a reason when rejecting an organization", async () => {
    const token = await createAdminToken();
    const { organization } = await createPendingClient();
    const invalid = await request(app)
      .patch(`/api/moderation/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: OrganizationStatus.REJECTED });
    expect(invalid.status).toBe(400);

    const rejected = await request(app)
      .patch(`/api/moderation/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: OrganizationStatus.REJECTED,
        rejectionReason: "Missing documents",
      });
    expect(rejected.status).toBe(200);
    expect(rejected.body).toMatchObject({
      id: organization.id,
      status: OrganizationStatus.REJECTED,
      rejectionReason: "Missing documents",
    });
  });
});
