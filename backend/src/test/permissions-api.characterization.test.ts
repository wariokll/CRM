import { Role } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { clearApiDatabase, createApiUser } from "./api-test-app.js";
import { permissionGates, send } from "./api-characterization.helpers.js";

beforeEach(clearApiDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("permission API characterization", () => {
  it("keeps default permission gates and endpoint scopes for every staff role", async () => {
    const users = new Map<Role, string>();
    for (const role of Object.values(Role)) {
      users.set(role, (await createApiUser(role)).token);
    }

    for (const gate of permissionGates) {
      for (const endpoint of gate.endpoints) {
        for (const role of Object.values(Role)) {
          const response = await send(endpoint, users.get(role));
          if (gate.roles.includes(role)) {
            expect(
              response.status,
              `${role} should pass ${gate.permission} at ${endpoint.join(" ")}`,
            ).not.toBe(403);
          } else {
            expect(
              response.status,
              `${role} should be denied ${gate.permission} at ${endpoint.join(" ")}`,
            ).toBe(403);
          }
        }
      }
    }
  });
});
