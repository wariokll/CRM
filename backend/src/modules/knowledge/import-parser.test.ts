import { Role } from "@prisma/client";
import { readFileSync } from "node:fs";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
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

let sequence = 0;

async function importFile(originalname: string, buffer: Buffer) {
  sequence += 1;
  const { user, token } = await createApiUser(Role.DIRECTOR);
  const section = await prisma.knowledgeSection.create({
    data: {
      name: `Parser ${Date.now()} ${sequence}`,
      createdBy: { connect: { id: user.id } },
    },
  });
  const response = await request(app)
    .post("/api/knowledge/import")
    .set("Authorization", `Bearer ${token}`)
    .field("sectionId", String(section.id))
    .attach("files", buffer, originalname);
  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({ imported: 1, skipped: 0, failed: [] });
  return prisma.knowledgeArticle.findFirstOrThrow({
    where: { sectionId: section.id },
    select: { body: true },
  });
}

describe("knowledge import parser", () => {
  it("decodes UTF-8 with a byte-order mark", async () => {
    const article = await importFile(
      "note.TXT",
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("Hello")]),
    );
    expect(article.body).toBe("Hello");
  });

  it("decodes UTF-16 little-endian and big-endian text", async () => {
    const littleBytes = Buffer.from("Hello", "utf16le");
    const little = Buffer.concat([Buffer.from([0xff, 0xfe]), littleBytes]);
    const littleArticle = await importFile("little.txt", little);

    const bigBytes = Buffer.from(littleBytes);
    for (let index = 0; index < bigBytes.length; index += 2) {
      [bigBytes[index], bigBytes[index + 1]] = [
        bigBytes[index + 1],
        bigBytes[index],
      ];
    }
    const big = Buffer.concat([Buffer.from([0xfe, 0xff]), bigBytes]);
    const bigArticle = await importFile("big.txt", big);
    expect(littleArticle.body).toBe("Hello");
    expect(bigArticle.body).toBe("Hello");
  });

  it("falls back to Windows-1251 for legacy Cyrillic text", async () => {
    const article = await importFile(
      "legacy.txt",
      Buffer.from([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]),
    );
    expect(article.body).toBe("Привет");
  });

  it("converts DOCX paragraphs and decodes HTML entities", async () => {
    const docx = readFileSync(
      new URL("./fixtures/minimal.docx", import.meta.url),
    );
    const article = await importFile("sample.docx", docx);
    expect(article.body).toBe("Hello & world\nSecond line");
  });
});
