import {
  CommentVisibility,
  Priority,
  RequestStatus,
  Role,
  Urgency,
} from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../../db.js";
import {
  app,
  clearApiDatabase,
  createApiDepartment,
  createApiUser,
} from "../../test/api-test-app.js";

beforeEach(clearApiDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

async function createRequestType() {
  const department = await createApiDepartment("Request API", "request-api");
  return prisma.requestType.create({
    data: {
      name: "Request API type",
      departmentId: department.id,
      requiresOrganization: false,
      requiresStore: false,
      templateFields: [],
    },
  });
}

describe("request API characterization", () => {
  it("validates required fields and rejects a missing request type", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const invalid = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${director.token}`)
      .send({});

    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({
      message: expect.any(String),
      issues: expect.any(Array),
    });

    const missingType = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${director.token}`)
      .send({
        typeId: 999999999,
        urgency: Urgency.URGENT,
        description: "Request with missing type",
      });
    expect(missingType.status).toBe(400);
    expect(missingType.body.message).toBe("Тип заявки недоступен");
  });

  it("creates, lists, updates, comments on, assigns, and deletes a request", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const type = await createRequestType();
    const master = await createApiUser(Role.MASTER);
    await prisma.userDepartment.create({
      data: { userId: master.user.id, departmentId: type.departmentId },
    });
    const auth = { Authorization: `Bearer ${director.token}` };
    const created = await request(app).post("/api/requests").set(auth).send({
      typeId: type.id,
      urgency: Urgency.URGENT,
      priority: Priority.HIGH,
      description: "Replace the damaged door closer",
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      id: expect.any(Number),
      typeId: type.id,
      departmentId: type.departmentId,
      urgency: Urgency.URGENT,
      priority: Priority.HIGH,
      status: RequestStatus.NEW,
      description: "Replace the damaged door closer",
    });
    const id = created.body.id as number;

    const list = await request(app).get("/api/requests").set(auth);
    expect(list.status).toBe(200);
    expect(list.body.map((row: { id: number }) => row.id)).toContain(id);

    const assignees = await request(app)
      .get("/api/requests/assignees")
      .set(auth);
    expect(assignees.status).toBe(200);
    expect(assignees.body).toEqual(expect.any(Array));

    const updated = await request(app)
      .patch(`/api/requests/${id}`)
      .set(auth)
      .send({
        status: RequestStatus.ACCEPTED,
        adminComment: "We will inspect it",
      });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id,
      status: RequestStatus.ACCEPTED,
      adminComment: "We will inspect it",
    });

    const comment = await request(app)
      .post(`/api/requests/${id}/comments`)
      .set(auth)
      .send({
        body: "Technician scheduled",
        visibility: CommentVisibility.INTERNAL,
      });
    expect(comment.status).toBe(201);
    expect(comment.body).toMatchObject({
      requestId: id,
      body: "Technician scheduled",
      visibility: CommentVisibility.INTERNAL,
    });

    const masterAuth = { Authorization: `Bearer ${master.token}` };
    const assigned = await request(app)
      .post(`/api/requests/${id}/assignees/self`)
      .set(masterAuth);
    expect(assigned.status).toBe(204);
    const unassigned = await request(app)
      .delete(`/api/requests/${id}/assignees/self`)
      .set(masterAuth);
    expect(unassigned.status).toBe(204);

    const deleted = await request(app).delete(`/api/requests/${id}`).set(auth);
    expect(deleted.status).toBe(204);
    await expect(
      prisma.request.findUnique({ where: { id } }),
    ).resolves.toBeNull();
  });

  it("keeps missing-record, invalid-transition, and role-denial responses", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const client = await createApiUser(Role.CLIENT);
    const type = await createRequestType();
    const created = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${director.token}`)
      .send({
        typeId: type.id,
        urgency: Urgency.URGENT,
        description: "A request to protect",
      });
    expect(created.status).toBe(201);
    const id = created.body.id as number;

    const missing = await request(app)
      .patch("/api/requests/999999999")
      .set("Authorization", `Bearer ${director.token}`)
      .send({ status: RequestStatus.ACCEPTED });
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Заявка не найдена");

    const invalidTransition = await request(app)
      .patch(`/api/requests/${id}`)
      .set("Authorization", `Bearer ${director.token}`)
      .send({ status: "NOT_A_STATUS" });
    expect(invalidTransition.status).toBe(400);
    expect(invalidTransition.body.issues).toEqual(expect.any(Array));

    const deniedUpdate = await request(app)
      .patch(`/api/requests/${id}`)
      .set("Authorization", `Bearer ${client.token}`)
      .send({ priority: Priority.CRITICAL });
    expect(deniedUpdate.status).toBe(403);

    const deniedDelete = await request(app)
      .delete(`/api/requests/${id}`)
      .set("Authorization", `Bearer ${client.token}`);
    expect(deniedDelete.status).toBe(403);

    const missingComment = await request(app)
      .post("/api/requests/999999999/comments")
      .set("Authorization", `Bearer ${director.token}`)
      .send({ body: "No request" });
    expect(missingComment.status).toBe(404);

    const missingAssignment = await request(app)
      .post("/api/requests/999999999/assignees/self")
      .set("Authorization", `Bearer ${director.token}`);
    expect(missingAssignment.status).toBe(404);

    const missingUnassignment = await request(app)
      .delete("/api/requests/999999999/assignees/self")
      .set("Authorization", `Bearer ${director.token}`);
    expect(missingUnassignment.status).toBe(204);

    const missingDelete = await request(app)
      .delete("/api/requests/999999999")
      .set("Authorization", `Bearer ${director.token}`);
    expect(missingDelete.status).toBe(404);
  });
});
