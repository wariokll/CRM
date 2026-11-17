import { basename, extname } from "node:path";
import { prisma } from "../../db.js";
import { imageExtension, parseImportFile } from "./import-parser.js";
import type { ArticleInput, SectionInput } from "./knowledge.contracts.js";

export class KnowledgeServiceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const sectionCount = { _count: { select: { children: true, articles: true } } };

export async function listSections() {
  return prisma.knowledgeSection.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      ...sectionCount,
      articles: {
        orderBy: [{ position: "asc" }, { title: "asc" }],
        select: { id: true, title: true },
      },
    },
  });
}

export async function createSection(input: SectionInput, userId: number) {
  if (input.parentId) {
    const parent = await prisma.knowledgeSection.findUnique({
      where: { id: input.parentId },
      select: { id: true },
    });
    if (!parent) throw new KnowledgeServiceError(404, "Раздел не найден");
  }
  return prisma.knowledgeSection.create({
    data: { ...input, createdByUserId: userId },
    include: sectionCount,
  });
}

export async function updateSection(id: number, input: Partial<SectionInput>) {
  if (input.parentId !== undefined) {
    if (input.parentId === id)
      throw new KnowledgeServiceError(400, "Раздел нельзя вложить в себя");
    let parentId = input.parentId;
    while (parentId) {
      const parent = await prisma.knowledgeSection.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true },
      });
      if (!parent) throw new KnowledgeServiceError(404, "Раздел не найден");
      if (parent.id === id)
        throw new KnowledgeServiceError(
          400,
          "Нельзя вложить раздел в его подраздел",
        );
      parentId = parent.parentId;
    }
  }
  return prisma.knowledgeSection.update({
    where: { id },
    data: input,
    include: sectionCount,
  });
}

export async function deleteSection(id: number) {
  const section = await prisma.knowledgeSection.findUnique({
    where: { id },
    select: { _count: { select: { children: true, articles: true } } },
  });
  if (!section) throw new KnowledgeServiceError(404, "Раздел не найден");
  if (section._count.children || section._count.articles)
    throw new KnowledgeServiceError(
      409,
      "Сначала удалите или переместите статьи и подразделы",
    );
  await prisma.knowledgeSection.delete({ where: { id } });
}

export async function importFiles(
  sectionId: number,
  userId: number,
  files: Express.Multer.File[],
  submittedNames: unknown,
) {
  const section = await prisma.knowledgeSection.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });
  if (!section) throw new KnowledgeServiceError(404, "Раздел не найден");
  if (!files.length)
    throw new KnowledgeServiceError(400, "Выберите файлы для импорта");
  let imported = 0;
  let skipped = 0;
  const failed: { fileName: string; reason: string }[] = [];
  const names = Array.isArray(submittedNames)
    ? submittedNames
    : typeof submittedNames === "string"
      ? [submittedNames]
      : [];
  for (const [index, file] of files.entries()) {
    const submittedName = names[index];
    const fileName = basename(
      typeof submittedName === "string" ? submittedName : file.originalname,
    );
    const title = basename(fileName, extname(fileName)).trim();
    try {
      if (title.length < 2 || title.length > 240)
        throw new Error("Название файла должно содержать от 2 до 240 символов");
      const existing = await prisma.knowledgeArticle.findFirst({
        where: { sectionId, title },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      const parsed = await parseImportFile(file);
      if (!parsed.body.trim()) throw new Error("В документе не найден текст");
      if (parsed.body.length > 900_000)
        throw new Error("Извлечённый текст превышает допустимый размер статьи");
      await prisma.$transaction(async (transaction) => {
        const article = await transaction.knowledgeArticle.create({
          data: {
            sectionId,
            title,
            body: parsed.body,
            createdByUserId: userId,
          },
          select: { id: true },
        });
        let body = parsed.body;
        for (const [imageIndex, image] of parsed.images.entries()) {
          if (!image.mimeType.startsWith("image/"))
            throw new Error(
              "DOCX содержит файл, который не распознан как изображение",
            );
          const attachment = await transaction.knowledgeAttachment.create({
            data: {
              articleId: article.id,
              fileName: `image-${imageIndex + 1}.${imageExtension(image.mimeType)}`,
              mimeType: image.mimeType,
              size: image.buffer.length,
              data: Uint8Array.from(image.buffer),
            },
            select: { id: true },
          });
          body = body.replaceAll(
            `[[import-image:${imageIndex}]]`,
            `[[image:${attachment.id}]]`,
          );
        }
        if (body !== parsed.body)
          await transaction.knowledgeArticle.update({
            where: { id: article.id },
            data: { body },
          });
      });
      imported += 1;
    } catch (reason) {
      failed.push({
        fileName,
        reason:
          reason instanceof Error
            ? reason.message
            : "Не удалось обработать файл",
      });
    }
  }
  return { imported, skipped, failed };
}

export async function listArticles(sectionId?: number, search?: string) {
  const articles = await prisma.knowledgeArticle.findMany({
    where: {
      ...(sectionId && { sectionId }),
      ...(search && {
        OR: [{ title: { contains: search } }, { body: { contains: search } }],
      }),
    },
    orderBy: [{ position: "asc" }, { title: "asc" }],
    select: {
      id: true,
      sectionId: true,
      title: true,
      body: true,
      position: true,
      updatedAt: true,
      section: { select: { name: true } },
    },
  });
  return articles.map(({ body, ...article }) => ({
    ...article,
    excerpt: body.replace(/\s+/g, " ").slice(0, 220),
  }));
}

export async function createArticle(input: ArticleInput, userId: number) {
  const section = await prisma.knowledgeSection.findUnique({
    where: { id: input.sectionId },
    select: { id: true },
  });
  if (!section) throw new KnowledgeServiceError(404, "Раздел не найден");
  return prisma.knowledgeArticle.create({
    data: { ...input, createdByUserId: userId },
    select: { id: true, sectionId: true, title: true, updatedAt: true },
  });
}

export async function getArticle(id: number) {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id },
    include: {
      section: { select: { id: true, name: true } },
      attachments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
    },
  });
  if (!article) throw new KnowledgeServiceError(404, "Статья не найдена");
  return article;
}

export async function updateArticle(id: number, input: Partial<ArticleInput>) {
  if (input.sectionId) {
    const section = await prisma.knowledgeSection.findUnique({
      where: { id: input.sectionId },
      select: { id: true },
    });
    if (!section) throw new KnowledgeServiceError(404, "Раздел не найден");
  }
  return prisma.knowledgeArticle.update({
    where: { id },
    data: input,
    select: { id: true, sectionId: true, title: true, updatedAt: true },
  });
}

export async function deleteArticle(id: number) {
  await prisma.knowledgeArticle.delete({ where: { id } });
}

export async function uploadAttachments(
  articleId: number,
  files: Express.Multer.File[],
) {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: articleId },
    select: { id: true },
  });
  if (!article) throw new KnowledgeServiceError(404, "Статья не найдена");
  return Promise.all(
    files.map((file) =>
      prisma.knowledgeAttachment.create({
        data: {
          articleId,
          fileName: basename(file.originalname).slice(0, 255),
          mimeType: file.mimetype || "application/octet-stream",
          size: file.size,
          data: Uint8Array.from(file.buffer),
        },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      }),
    ),
  );
}

export async function getAttachment(id: number) {
  const attachment = await prisma.knowledgeAttachment.findUnique({
    where: { id },
    select: { fileName: true, mimeType: true, data: true },
  });
  if (!attachment) throw new KnowledgeServiceError(404, "Файл не найден");
  return attachment;
}

export async function deleteAttachment(id: number) {
  await prisma.knowledgeAttachment.delete({ where: { id } });
}
