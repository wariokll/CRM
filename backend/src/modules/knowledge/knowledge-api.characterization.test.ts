import { Role } from "@prisma/client";
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

describe("knowledge API characterization", () => {
  it("creates and updates sections and articles, then deletes them", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const auth = { Authorization: `Bearer ${director.token}` };
    const section = await request(app)
      .post("/api/knowledge/sections")
      .set(auth)
      .send({ name: "New knowledge section" });
    expect(section.status).toBe(201);

    const renamedSection = await request(app)
      .patch(`/api/knowledge/sections/${section.body.id}`)
      .set(auth)
      .send({ name: "Updated knowledge section" });
    expect(renamedSection.status).toBe(200);
    expect(renamedSection.body.name).toBe("Updated knowledge section");

    const sections = await request(app)
      .get("/api/knowledge/sections")
      .set(auth);
    expect(sections.status).toBe(200);
    expect(sections.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: section.body.id }),
      ]),
    );

    const article = await request(app)
      .post("/api/knowledge/articles")
      .set(auth)
      .send({
        sectionId: section.body.id,
        title: "Article before update",
        body: "Initial article body.",
      });
    expect(article.status).toBe(201);

    const updatedArticle = await request(app)
      .patch(`/api/knowledge/articles/${article.body.id}`)
      .set(auth)
      .send({ title: "Article after update" });
    expect(updatedArticle.status).toBe(200);
    expect(updatedArticle.body.title).toBe("Article after update");

    const readArticle = await request(app)
      .get(`/api/knowledge/articles/${article.body.id}`)
      .set(auth);
    expect(readArticle.status).toBe(200);
    expect(readArticle.body.body).toBe("Initial article body.");

    const deletedArticle = await request(app)
      .delete(`/api/knowledge/articles/${article.body.id}`)
      .set(auth);
    expect(deletedArticle.status).toBe(204);

    const deletedSection = await request(app)
      .delete(`/api/knowledge/sections/${section.body.id}`)
      .set(auth);
    expect(deletedSection.status).toBe(204);
  });

  it("uploads, downloads, and removes article attachments", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const auth = { Authorization: `Bearer ${director.token}` };
    const section = await request(app)
      .post("/api/knowledge/sections")
      .set(auth)
      .send({ name: "Attachment section" });
    expect(section.status).toBe(201);
    const article = await request(app)
      .post("/api/knowledge/articles")
      .set(auth)
      .send({
        sectionId: section.body.id,
        title: "Attachment article",
        body: "Article with an attachment.",
      });
    expect(article.status).toBe(201);

    const uploaded = await request(app)
      .post(`/api/knowledge/articles/${article.body.id}/attachments`)
      .set(auth)
      .attach("files", Buffer.from("Attachment contents"), "manual.txt");
    expect(uploaded.status).toBe(201);
    expect(uploaded.body).toHaveLength(1);
    expect(uploaded.body[0]).toMatchObject({
      fileName: "manual.txt",
      size: 19,
    });

    const attachmentId = uploaded.body[0].id as number;
    const downloaded = await request(app)
      .get(`/api/knowledge/attachments/${attachmentId}/download`)
      .set(auth);
    expect(downloaded.status).toBe(200);
    expect(downloaded.text).toBe("Attachment contents");

    const deleted = await request(app)
      .delete(`/api/knowledge/attachments/${attachmentId}`)
      .set(auth);
    expect(deleted.status).toBe(204);
  });

  it("reports invalid and missing knowledge resources and denies clients", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const client = await createApiUser(Role.CLIENT);
    const auth = { Authorization: `Bearer ${director.token}` };

    const invalidId = await request(app)
      .get("/api/knowledge/articles/not-an-id")
      .set(auth);
    expect(invalidId.status).toBe(400);
    expect(invalidId.body.issues).toEqual(expect.any(Array));

    const missingArticle = await request(app)
      .get("/api/knowledge/articles/999999999")
      .set(auth);
    expect(missingArticle.status).toBe(404);

    const missingSection = await request(app)
      .post("/api/knowledge/articles")
      .set(auth)
      .send({ sectionId: 999999999, title: "Missing section", body: "Body" });
    expect(missingSection.status).toBe(404);

    const denied = await request(app)
      .get("/api/knowledge/sections")
      .set("Authorization", `Bearer ${client.token}`);
    expect(denied.status).toBe(403);
  });
});
