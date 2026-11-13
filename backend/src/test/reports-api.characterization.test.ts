import { Role } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { clearApiDatabase, createApiUser } from "./api-test-app.js";
import { send } from "./api-characterization.helpers.js";

beforeEach(clearApiDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("report access characterization", () => {
  it("returns scoped report access according to the current role defaults", async () => {
    for (const role of [Role.DIRECTOR, Role.DEPARTMENT_HEAD, Role.MASTER]) {
      const { token } = await createApiUser(role);
      const response = await send(["GET", "/api/requests/stats"], token);
      expect(response.status, `${role} report access`).toBe(200);
    }

    const client = await createApiUser(Role.CLIENT);
    const denied = await send(["GET", "/api/requests/stats"], client.token);
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ message: expect.any(String) });
  });
});
