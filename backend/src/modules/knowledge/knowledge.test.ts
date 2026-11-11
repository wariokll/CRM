import { Role, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({ prisma, requestLogger: (_req, _res, next) => next() });
const suffix = `${Date.now()}`;
const userIds: number[] = [];
const sectionIds: number[] = [];
let sequence = 0;
async function director() {
  sequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: "Knowledge test",
      email: `knowledge-${suffix}-${sequence}@example.test`,
      passwordHash: "unused",
      phone: `+702${suffix.slice(-7)}${sequence}`,
      role: Role.DIRECTOR,
      status: UserStatus.ACTIVE,
    },
  });
  userIds.push(user.id);
  return createAccessToken({ userId: user.id, role: user.role });
}
afterAll(async () => {
  if (sectionIds.length)
    await prisma.knowledgeSection.deleteMany({
      where: { id: { in: sectionIds } },
    });
  if (userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("knowledge endpoint behavior", () => {
  it("creates sections and articles, returning article excerpts in list responses", async () => {
    const token = await director();
    const section = await request(app)
      .post("/api/knowledge/sections")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Knowledge ${suffix}` });
    expect(section.status).toBe(201);
    sectionIds.push(section.body.id);
    const article = await request(app)
      .post("/api/knowledge/articles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sectionId: section.body.id,
        title: `Article ${suffix}`,
        body: "A useful knowledge article.",
      });
    expect(article.status).toBe(201);
    const list = await request(app)
      .get("/api/knowledge/articles")
      .set("Authorization", `Bearer ${token}`);
    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: article.body.id,
          excerpt: "A useful knowledge article.",
        }),
      ]),
    );
  });

  it("imports UTF-8 text files and reports duplicate imports as skipped", async () => {
    const token = await director();
    const section = await request(app)
      .post("/api/knowledge/sections")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Import ${suffix}` });
    expect(section.status).toBe(201);
    sectionIds.push(section.body.id);
    const submit = () =>
      request(app)
        .post("/api/knowledge/import")
        .set("Authorization", `Bearer ${token}`)
        .field("sectionId", String(section.body.id))
        .attach("files", Buffer.from("Imported body"), "Imported article.txt");
    const first = await submit();
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ imported: 1, skipped: 0, failed: [] });
    const second = await submit();
    expect(second.body).toMatchObject({ imported: 0, skipped: 1, failed: [] });
  });
});
