import { BoardType, Role } from "@prisma/client";
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

describe("board API characterization", () => {
  it("covers team-board access, columns, cards, archive, restore, and removal", async () => {
    const owner = await createApiUser(Role.DIRECTOR);
    const member = await createApiUser(Role.MASTER);
    const auth = { Authorization: `Bearer ${owner.token}` };
    const created = await request(app)
      .post("/api/boards")
      .set(auth)
      .send({ name: "API team board", type: BoardType.TEAM });
    expect(created.status).toBe(201);
    const boardId = created.body.id as number;

    const listed = await request(app)
      .get("/api/boards")
      .query({ type: BoardType.TEAM })
      .set(auth);
    expect(listed.status).toBe(200);
    expect(listed.body.map((board: { id: number }) => board.id)).toContain(
      boardId,
    );

    const board = await request(app).get(`/api/boards/${boardId}`).set(auth);
    expect(board.status).toBe(200);
    expect(board.body.columns).toEqual([]);

    const access = await request(app)
      .get(`/api/boards/${boardId}/access`)
      .set(auth);
    expect(access.status).toBe(200);
    expect(access.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: member.user.id, hasAccess: false }),
      ]),
    );
    const granted = await request(app)
      .post(`/api/boards/${boardId}/access`)
      .set(auth)
      .send({ userId: member.user.id });
    expect(granted.status).toBe(204);
    const memberBoard = await request(app)
      .get(`/api/boards/${boardId}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(memberBoard.status).toBe(200);
    const revoked = await request(app)
      .delete(`/api/boards/${boardId}/access/${member.user.id}`)
      .set(auth);
    expect(revoked.status).toBe(204);
    const revokedBoard = await request(app)
      .get(`/api/boards/${boardId}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(revokedBoard.status).toBe(403);

    const firstColumn = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set(auth)
      .send({ name: "Open" });
    const secondColumn = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set(auth)
      .send({ name: "Done" });
    expect(firstColumn.status).toBe(201);
    expect(secondColumn.status).toBe(201);

    const renamedColumn = await request(app)
      .patch(`/api/boards/columns/${firstColumn.body.id}`)
      .set(auth)
      .send({ name: "In progress", version: firstColumn.body.version });
    expect(renamedColumn.status).toBe(200);
    const movedColumns = await request(app)
      .post(`/api/boards/columns/${secondColumn.body.id}/move`)
      .set(auth)
      .send({ position: 0, version: secondColumn.body.version });
    expect(movedColumns.status).toBe(200);

    const currentColumns = await prisma.boardColumn.findMany({
      where: { boardId },
    });
    const layout = await request(app)
      .patch(`/api/boards/${boardId}/layout`)
      .set(auth)
      .send({
        columns: [
          {
            id: firstColumn.body.id,
            version: currentColumns.find(
              (item) => item.id === firstColumn.body.id,
            )!.version,
            width: 240,
            cardsPerRow: 1,
          },
          {
            id: secondColumn.body.id,
            version: currentColumns.find(
              (item) => item.id === secondColumn.body.id,
            )!.version,
            width: 240,
            cardsPerRow: 1,
          },
        ],
      });
    expect(layout.status).toBe(200);

    const card = await request(app)
      .post(`/api/boards/columns/${firstColumn.body.id}/cards`)
      .set(auth)
      .send({
        title: "Fix the entrance door",
        description: "Check the closer",
      });
    expect(card.status).toBe(201);
    const updatedCard = await request(app)
      .patch(`/api/boards/cards/${card.body.id}`)
      .set(auth)
      .send({
        title: "Replace the entrance door closer",
        description: "Bring a spare part",
        version: card.body.version,
      });
    expect(updatedCard.status).toBe(200);
    const movedCard = await request(app)
      .post(`/api/boards/cards/${card.body.id}/move`)
      .set(auth)
      .send({
        targetColumnId: secondColumn.body.id,
        position: 0,
        version: updatedCard.body.version,
      });
    expect(movedCard.status).toBe(200);

    const storedCard = await prisma.boardCard.findUniqueOrThrow({
      where: { id: card.body.id },
    });
    const archived = await request(app)
      .post(`/api/boards/cards/${card.body.id}/archive`)
      .set(auth)
      .send({ version: storedCard.version });
    expect(archived.status).toBe(204);
    const archive = await request(app)
      .get(`/api/boards/${boardId}/archive`)
      .set(auth);
    expect(archive.status).toBe(200);
    expect(archive.body.map((entry: { id: number }) => entry.id)).toContain(
      card.body.id,
    );

    const archivedCard = await prisma.boardCard.findUniqueOrThrow({
      where: { id: card.body.id },
    });
    const restored = await request(app)
      .post(`/api/boards/cards/${card.body.id}/restore`)
      .set(auth)
      .send({
        version: archivedCard.version,
        targetColumnId: firstColumn.body.id,
      });
    expect(restored.status).toBe(200);

    const restoredCard = await prisma.boardCard.findUniqueOrThrow({
      where: { id: card.body.id },
    });
    const deletedCard = await request(app)
      .delete(`/api/boards/cards/${card.body.id}`)
      .set(auth)
      .send({ version: restoredCard.version });
    expect(deletedCard.status).toBe(204);

    const currentFirstColumn = await prisma.boardColumn.findUniqueOrThrow({
      where: { id: firstColumn.body.id },
    });
    const deletedColumn = await request(app)
      .delete(`/api/boards/columns/${firstColumn.body.id}`)
      .set(auth)
      .send({ version: currentFirstColumn.version });
    expect(deletedColumn.status).toBe(204);
    const renamedBoard = await request(app)
      .patch(`/api/boards/${boardId}`)
      .set(auth)
      .send({ name: "Updated team board" });
    expect(renamedBoard.status).toBe(200);
    const deletedBoard = await request(app)
      .delete(`/api/boards/${boardId}`)
      .set(auth);
    expect(deletedBoard.status).toBe(204);
  });

  it("characterizes invalid IDs, missing boards, and role denial", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const client = await createApiUser(Role.CLIENT);
    const auth = { Authorization: `Bearer ${director.token}` };
    const invalidId = await request(app).get("/api/boards/not-an-id").set(auth);
    expect(invalidId.status).toBe(400);

    const missingBoard = await request(app)
      .get("/api/boards/999999999")
      .set(auth);
    expect(missingBoard.status).toBe(404);

    const missingCard = await request(app)
      .post("/api/boards/cards/999999999/restore")
      .set(auth)
      .send({ version: 1, targetColumnId: 1 });
    expect(missingCard.status).toBe(404);

    const denied = await request(app)
      .get("/api/boards?type=PERSONAL")
      .set("Authorization", `Bearer ${client.token}`);
    expect(denied.status).toBe(403);
  });
});
