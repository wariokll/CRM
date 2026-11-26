import { basename } from "node:path";
import type { PrismaClient } from "@prisma/client";
import type { ArticleInput, SectionInput } from "./knowledge.contracts.js";
import { createKnowledgeImportService } from "./knowledge-import.service.js";
import { KnowledgeServiceError } from "./knowledge.errors.js";
export { KnowledgeServiceError } from "./knowledge.errors.js";

const sectionCount = { _count: { select: { children: true, articles: true } } };

export function createKnowledgeService(prisma: PrismaClient) {
  const { importFiles } = createKnowledgeImportService(prisma);
  async function listSections() {
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

  async function createSection(input: SectionInput, userId: number) {
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

  async function updateSection(id: number, input: Partial<SectionInput>) {
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

  async function deleteSection(id: number) {
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

  async function listArticles(sectionId?: number, search?: string) {
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

  async function createArticle(input: ArticleInput, userId: number) {
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

  async function getArticle(id: number) {
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

  async function updateArticle(id: number, input: Partial<ArticleInput>) {
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

  async function deleteArticle(id: number) {
    await prisma.knowledgeArticle.delete({ where: { id } });
  }

  async function uploadAttachments(
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

  async function getAttachment(id: number) {
    const attachment = await prisma.knowledgeAttachment.findUnique({
      where: { id },
      select: { fileName: true, mimeType: true, data: true },
    });
    if (!attachment) throw new KnowledgeServiceError(404, "Файл не найден");
    return attachment;
  }

  async function deleteAttachment(id: number) {
    await prisma.knowledgeAttachment.delete({ where: { id } });
  }

  return {
    listSections,
    createSection,
    updateSection,
    deleteSection,
    importFiles,
    listArticles,
    createArticle,
    getArticle,
    updateArticle,
    deleteArticle,
    uploadAttachments,
    getAttachment,
    deleteAttachment,
  };
}
