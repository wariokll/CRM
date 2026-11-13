import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express, RequestHandler } from "express";
import * as appModule from "../app.js";
import { prisma } from "../db.js";

const appFactory = appModule as unknown as {
  createApp?: (dependencies: {
    prisma: typeof prisma;
    requestLogger: RequestHandler;
  }) => Express;
  app?: Express;
};
const app = appFactory.createApp
  ? appFactory.createApp({
      prisma,
      requestLogger: (_req, _res, next) => next(),
    })
  : appFactory.app!;

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Cyrillic API error messages", () => {
  it("returns readable authentication text in protected endpoint errors", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Требуется авторизация" });
  });

  it("returns readable validation text for invalid registration", async () => {
    const response = await request(app).post("/api/auth/register").send({});
    expect(response.status).toBe(400);
    expect(typeof response.body.message).toBe("string");
    expect(response.body.message).not.toMatch(
      /\u0420\u0420|\u0420\u0421|\ufffd/u,
    );
    expect(response.body.issues).toEqual(expect.any(Array));
  });
});
