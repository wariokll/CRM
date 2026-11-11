import { Role, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";

const app = createApp({
  prisma,
  requestLogger: (_req, _res, next) => next(),
});
const createdUserIds: number[] = [];
let sequence = 0;

async function createLoginUser(status: UserStatus) {
  sequence += 1;
  const password = "Auth-Characterization-123";
  const user = await prisma.user.create({
    data: {
      ipName: "Auth characterization",
      email: `auth-characterization-${Date.now()}-${sequence}@example.test`,
      passwordHash: await bcrypt.hash(password, 4),
      phone: `+7888${String(Date.now()).slice(-7)}${sequence}`,
      role: Role.DIRECTOR,
      status,
    },
  });
  createdUserIds.push(user.id);
  return { user, password };
}

afterAll(async () => {
  if (createdUserIds.length)
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe("auth endpoint behavior", () => {
  it("returns 401 for an incorrect password", async () => {
    const { user } = await createLoginUser(UserStatus.ACTIVE);
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Неверный email или пароль");
  });

  it("blocks blocked users from login", async () => {
    const { user, password } = await createLoginUser(UserStatus.BLOCKED);
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Аккаунт заблокирован");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});
