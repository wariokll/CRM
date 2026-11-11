import { BoardType, Role, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({ prisma, requestLogger: (_req, _res, next) => next() });
const suffix = `${Date.now()}`;
const userIds: number[] = [];
const boardIds: number[] = [];
let sequence = 0;
async function createUser(role: Role) {
  sequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: `Board ${role}`,
      email: `board-${role}-${suffix}-${sequence}@example.test`,
      passwordHash: "unused",
      phone: `+703${suffix.slice(-7)}${sequence}`,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(user.id);
  return { user, token: createAccessToken({ userId: user.id, role }) };
}
afterAll(async () => {
  if (boardIds.length)
    await prisma.board.deleteMany({ where: { id: { in: boardIds } } });
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("board endpoint behavior", () => {
  it("creates and lists the current user's personal board", async () => {
    const director = await createUser(Role.DIRECTOR);
    const created = await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${director.token}`)
      .send({ name: `Board ${suffix}`, type: BoardType.PERSONAL });
    expect(created.status).toBe(201);
    boardIds.push(created.body.id);
    const list = await request(app)
      .get("/api/boards")
      .query({ type: BoardType.PERSONAL })
      .set("Authorization", `Bearer ${director.token}`);
    expect(list.status).toBe(200);
    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          ownerId: director.user.id,
        }),
      ]),
    );
  });

  it("denies board access to clients", async () => {
    const client = await createUser(Role.CLIENT);
    const response = await request(app)
      .get("/api/boards")
      .query({ type: BoardType.PERSONAL })
      .set("Authorization", `Bearer ${client.token}`);
    expect(response.status).toBe(403);
  });
});
