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

describe("organization API characterization", () => {
  it("creates organizations, replaces members, updates, and deletes", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const firstClient = await createApiUser(Role.CLIENT);
    const secondClient = await createApiUser(Role.CLIENT);
    const auth = { Authorization: `Bearer ${director.token}` };

    const created = await request(app)
      .post("/api/organizations")
      .set(auth)
      .send({
        type: OrganizationType.IP,
        legalName: "API organization",
        shortName: "API org",
        contacts: [],
        memberIds: [firstClient.user.id, secondClient.user.id],
      });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("ACTIVE");

    const organizationId = created.body.id as number;
    const replaced = await request(app)
      .put(`/api/organizations/${organizationId}/members`)
      .set(auth)
      .send({ userIds: [secondClient.user.id] });
    expect(replaced.status).toBe(200);
    expect(
      replaced.body.members.map((member: { userId: number }) => member.userId),
    ).toEqual([secondClient.user.id]);

    const updated = await request(app)
      .patch(`/api/organizations/${organizationId}`)
      .set(auth)
      .send({ legalName: "Updated API organization" });
    expect(updated.status).toBe(200);
    expect(updated.body.legalName).toBe("Updated API organization");

    const list = await request(app).get("/api/organizations").set(auth);
    expect(list.status).toBe(200);
    expect(list.body.map((item: { id: number }) => item.id)).toContain(
      organizationId,
    );

    const deleted = await request(app)
      .delete(`/api/organizations/${organizationId}`)
      .set(auth);
    expect(deleted.status).toBe(204);
  });

  it("rejects invalid organization bodies and records missing IDs", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const auth = { Authorization: `Bearer ${director.token}` };
    const invalid = await request(app)
      .post("/api/organizations")
      .set(auth)
      .send({ type: "UNKNOWN", legalName: "x" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.issues).toEqual(expect.any(Array));

    const missing = await request(app)
      .patch("/api/organizations/999999999")
      .set(auth)
      .send({ legalName: "Missing" });
    expect(missing.status).toBe(404);

    const denied = await request(app)
      .put("/api/organizations/999999999/members")
      .set(
        "Authorization",
        `Bearer ${(await createApiUser(Role.CLIENT)).token}`,
      )
      .send({ userIds: [director.user.id] });
    expect(denied.status).toBe(403);
  });
});
