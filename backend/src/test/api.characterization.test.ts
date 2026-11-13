import { Role } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { clearApiDatabase, createApiUser } from "./api-test-app.js";
import { endpoints, send } from "./api-characterization.helpers.js";

beforeEach(clearApiDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("API characterization", () => {
  it("requires authentication on every protected registered endpoint", async () => {
    const protectedEndpoints = endpoints.filter(
      ([, path]) =>
        !path.startsWith("/api/health") &&
        !/^\/api\/auth\/(register|login|refresh|logout)$/.test(path),
    );

    expect(protectedEndpoints).toHaveLength(91);
    for (const endpoint of protectedEndpoints) {
      const response = await send(endpoint);
      expect(response.status, `${endpoint[0]} ${endpoint[1]}`).toBe(401);
    }
  });

  it.each(Object.values(Role))(
    "records endpoint responses for %s using an empty or default request",
    async (role) => {
      const { token } = await createApiUser(role);
      const outcomes: Array<[string, number]> = [];
      for (const endpoint of endpoints) {
        const [, path] = endpoint;
        if (
          path.startsWith("/api/health") ||
          /^\/api\/auth\/(register|login|refresh|logout)$/.test(path)
        ) {
          continue;
        }
        const response = await send(endpoint, token);
        expect(response.status, `${role} ${endpoint[0]} ${path}`).toBeLessThan(
          500,
        );
        outcomes.push([`${endpoint[0]} ${path}`, response.status]);
      }
      expect(outcomes).toMatchSnapshot();
    },
  );
});
