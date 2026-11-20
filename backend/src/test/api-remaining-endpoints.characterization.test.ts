import {
  OrganizationStatus,
  Role,
  StoreStatus,
  UserStatus,
} from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { app, clearApiDatabase, createApiUser } from "./api-test-app.js";

beforeEach(clearApiDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

async function createPendingOrganizationStore() {
  const { user } = await createApiUser(Role.CLIENT);
  await prisma.user.update({
    where: { id: user.id },
    data: { status: UserStatus.PENDING },
  });
  const organization = await prisma.organization.create({
    data: {
      legalName: `API moderation ${user.id}`,
      shortName: `API ${user.id}`,
      email: user.email,
      status: OrganizationStatus.PENDING,
      createdByUserId: user.id,
      members: { create: { userId: user.id, isPrimary: true } },
      stores: {
        create: {
          name: `API store ${user.id}`,
          address: `Address ${user.id}`,
          userId: user.id,
          status: StoreStatus.PENDING,
        },
      },
    },
    include: { stores: true },
  });
  const [store] = organization.stores;
  if (!store) throw new Error("A pending organization store is required");
  return { user, organization, store };
}

function requireFixture<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing ${name} fixture`);
  return value;
}

describe("remaining API endpoint scenarios", () => {
  it("covers catalogs, reports, moderation, and approval routes", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const auth = { Authorization: `Bearer ${director.token}` };

    const components = await request(app).get("/api/components").set(auth);
    expect(components.status).toBe(200);
    expect(components.body).toEqual(expect.any(Array));

    const date = new Date().toISOString().slice(0, 10);
    const stats = await request(app)
      .get(`/api/requests/stats?from=${date}&to=${date}`)
      .set(auth);
    expect(stats.status).toBe(200);
    expect(stats.body.total).toBe(0);
    const procurement = await request(app)
      .get(`/api/requests/procurement?from=${date}&to=${date}`)
      .set(auth);
    expect(procurement.status).toBe(200);
    expect(procurement.body).toEqual([]);
    const invalidPeriod = await request(app)
      .get("/api/requests/procurement?from=invalid&to=invalid")
      .set(auth);
    expect(invalidPeriod.status).toBe(400);
    expect(invalidPeriod.body.message).toBe("Некорректный период отчёта");
    const invalidStatsPeriod = await request(app)
      .get("/api/requests/stats?from=invalid&to=invalid")
      .set(auth);
    expect(invalidStatsPeriod.status).toBe(400);
    expect(invalidStatsPeriod.body.message).toBe("Некорректный период отчёта");

    const pending = await Promise.all(
      Array.from({ length: 5 }, () => createPendingOrganizationStore()),
    );
    const approvedOrg = requireFixture(pending[0], "approved organization");
    const rejectedOrg = requireFixture(pending[1], "rejected organization");
    const moderatedStore = requireFixture(pending[2], "moderated store");
    const approvedStore = requireFixture(pending[3], "approved store");
    const rejectedStore = requireFixture(pending[4], "rejected store");

    const pendingUsers = await request(app)
      .get("/api/moderation/users")
      .set(auth);
    expect(pendingUsers.status).toBe(200);
    expect(pendingUsers.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: approvedOrg.user.id }),
      ]),
    );
    const pendingOrganizations = await request(app)
      .get("/api/moderation/organizations")
      .set(auth);
    expect(pendingOrganizations.status).toBe(200);
    expect(pendingOrganizations.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: approvedOrg.organization.id }),
      ]),
    );
    const pendingStores = await request(app)
      .get("/api/moderation/stores")
      .set(auth);
    expect(pendingStores.status).toBe(200);
    expect(pendingStores.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: moderatedStore.store.id }),
      ]),
    );

    const invalidUserModeration = await request(app)
      .patch(`/api/moderation/users/${approvedOrg.user.id}`)
      .set(auth)
      .send({ status: "NOT_A_STATUS" });
    expect(invalidUserModeration.status).toBe(400);

    const invalidOrganizationRejection = await request(app)
      .post(`/api/organizations/${rejectedOrg.organization.id}/reject`)
      .set(auth)
      .send({});
    expect(invalidOrganizationRejection.status).toBe(400);
    const organizationApproval = await request(app)
      .post(`/api/organizations/${approvedOrg.organization.id}/approve`)
      .set(auth);
    expect(organizationApproval.status).toBe(200);
    expect(organizationApproval.body.status).toBe(OrganizationStatus.ACTIVE);
    const organizationRejection = await request(app)
      .post(`/api/organizations/${rejectedOrg.organization.id}/reject`)
      .set(auth)
      .send({ rejectionReason: "Missing documents" });
    expect(organizationRejection.status).toBe(200);
    expect(organizationRejection.body.status).toBe(OrganizationStatus.REJECTED);

    const invalidStoreModeration = await request(app)
      .patch(`/api/moderation/stores/${moderatedStore.store.id}`)
      .set(auth)
      .send({ status: StoreStatus.REJECTED });
    expect(invalidStoreModeration.status).toBe(400);
    const storeModeration = await request(app)
      .patch(`/api/moderation/stores/${moderatedStore.store.id}`)
      .set(auth)
      .send({
        status: StoreStatus.REJECTED,
        rejectionReason: "Missing documents",
      });
    expect(storeModeration.status).toBe(200);
    expect(storeModeration.body.status).toBe(StoreStatus.REJECTED);

    const storeApproval = await request(app)
      .post(`/api/stores/${approvedStore.store.id}/approve`)
      .set(auth);
    expect(storeApproval.status).toBe(200);
    expect(storeApproval.body.status).toBe(StoreStatus.ACTIVE);
    const invalidStoreRejection = await request(app)
      .post(`/api/stores/${rejectedStore.store.id}/reject`)
      .set(auth)
      .send({ rejectionReason: "x" });
    expect(invalidStoreRejection.status).toBe(400);
    const storeRejection = await request(app)
      .post(`/api/stores/${rejectedStore.store.id}/reject`)
      .set(auth)
      .send({ rejectionReason: "Closed location" });
    expect(storeRejection.status).toBe(200);
    expect(storeRejection.body.status).toBe(StoreStatus.REJECTED);

    const missingApproval = await request(app)
      .post("/api/organizations/999999999/approve")
      .set(auth);
    expect(missingApproval.status).toBe(404);
    const missingStoreModeration = await request(app)
      .patch("/api/moderation/stores/999999999")
      .set(auth)
      .send({ status: StoreStatus.ACTIVE });
    expect(missingStoreModeration.status).toBe(404);

    const missingUserModeration = await request(app)
      .patch("/api/moderation/users/999999999")
      .set(auth)
      .send({ status: UserStatus.ACTIVE });
    expect(missingUserModeration.status).toBe(404);

    const missingOrganizationModeration = await request(app)
      .patch("/api/moderation/organizations/999999999")
      .set(auth)
      .send({ status: OrganizationStatus.ACTIVE });
    expect(missingOrganizationModeration.status).toBe(404);
  });
});
