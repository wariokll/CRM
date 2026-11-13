import { OrganizationType, Role } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
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

describe("store API characterization", () => {
  it("creates, reads, updates credentials, and deletes a store", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const auth = { Authorization: `Bearer ${director.token}` };
    const organization = await prisma.organization.create({
      data: {
        type: OrganizationType.IP,
        legalName: "Store API organization",
        createdByUserId: director.user.id,
        members: { create: { userId: director.user.id, isPrimary: true } },
      },
    });
    const created = await request(app).post("/api/stores").set(auth).send({
      organizationId: organization.id,
      name: "API store",
      address: "5 Example Street",
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("ACTIVE");
    const storeId = created.body.id as number;

    const listed = await request(app).get("/api/stores").set(auth);
    expect(listed.status).toBe(200);
    expect(listed.body.map((store: { id: number }) => store.id)).toContain(
      storeId,
    );

    const updated = await request(app)
      .patch(`/api/stores/${storeId}`)
      .set(auth)
      .send({ name: "Updated API store" });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Updated API store");

    const emptyAccess = await request(app)
      .get(`/api/stores/${storeId}/access`)
      .set(auth);
    expect(emptyAccess.status).toBe(200);
    expect(emptyAccess.body).toBeNull();

    const savedAccess = await request(app)
      .put(`/api/stores/${storeId}/access`)
      .set(auth)
      .send({
        anydeskId: "desk-100",
        anydeskPassword: "secret-value",
        ofdUrl: "https://ofd.example.test",
        ofdLogin: "ofd-user",
        ofdPassword: "ofd-secret",
      });
    expect(savedAccess.status).toBe(204);

    const readAccess = await request(app)
      .get(`/api/stores/${storeId}/access`)
      .set(auth);
    expect(readAccess.status).toBe(200);
    expect(readAccess.body).toMatchObject({
      anydeskId: "desk-100",
      anydeskPassword: "secret-value",
      ofdLogin: "ofd-user",
      ofdPassword: "ofd-secret",
    });
    expect(readAccess.body.anydeskPasswordEncrypted).toBeUndefined();

    const deleted = await request(app)
      .delete(`/api/stores/${storeId}`)
      .set(auth);
    expect(deleted.status).toBe(204);
  });

  it("rejects invalid store input, missing stores, and client-only secret writes", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const client = await createApiUser(Role.CLIENT);
    const auth = { Authorization: `Bearer ${director.token}` };
    const invalid = await request(app)
      .post("/api/stores")
      .set(auth)
      .send({ organizationId: -1, name: "x", address: "y" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.issues).toEqual(expect.any(Array));

    const missing = await request(app)
      .patch("/api/stores/999999999")
      .set(auth)
      .send({ name: "Missing store" });
    expect(missing.status).toBe(404);

    const missingDelete = await request(app)
      .delete("/api/stores/999999999")
      .set(auth);
    expect(missingDelete.status).toBe(404);

    const missingAccess = await request(app)
      .get("/api/stores/999999999/access")
      .set(auth);
    expect(missingAccess.status).toBe(404);

    const missingAccessWrite = await request(app)
      .put("/api/stores/999999999/access")
      .set(auth)
      .send({ anydeskId: "missing-store" });
    expect(missingAccessWrite.status).toBe(404);

    const missingApproval = await request(app)
      .post("/api/stores/999999999/approve")
      .set(auth);
    expect(missingApproval.status).toBe(404);

    const missingRejection = await request(app)
      .post("/api/stores/999999999/reject")
      .set(auth)
      .send({ rejectionReason: "Missing store" });
    expect(missingRejection.status).toBe(404);

    const denied = await request(app)
      .put("/api/stores/999999999/access")
      .set("Authorization", `Bearer ${client.token}`)
      .send({ anydeskId: "cannot-write" });
    expect(denied.status).toBe(404);
  });
});
