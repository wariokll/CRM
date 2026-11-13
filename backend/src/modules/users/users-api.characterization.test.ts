import { Role, UserStatus } from "@prisma/client";
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

describe("users API characterization", () => {
  it("records invalid input, missing users, and route permission behavior", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const auth = { Authorization: `Bearer ${director.token}` };

    const invalidCreate = await request(app)
      .post("/api/users")
      .set(auth)
      .send({});
    expect(invalidCreate.status).toBe(400);

    const invalidStatus = await request(app)
      .patch("/api/users/999999999/status")
      .set(auth)
      .send({ status: "NOT_A_STATUS" });
    expect(invalidStatus.status).toBe(400);

    const missingStatus = await request(app)
      .patch("/api/users/999999999/status")
      .set(auth)
      .send({ status: UserStatus.BLOCKED });
    expect(missingStatus.status).toBe(404);

    const invalidPassword = await request(app)
      .patch("/api/users/999999999/password")
      .set(auth)
      .send({ password: "short" });
    expect(invalidPassword.status).toBe(400);

    const missingPassword = await request(app)
      .patch("/api/users/999999999/password")
      .set(auth)
      .send({ password: "LongEnoughPassword123" });
    expect(missingPassword.status).toBe(404);

    const denied = await request(app)
      .get("/api/users")
      .set(
        "Authorization",
        `Bearer ${(await createApiUser(Role.CLIENT)).token}`,
      );
    expect(denied.status).toBe(403);
  });
});
