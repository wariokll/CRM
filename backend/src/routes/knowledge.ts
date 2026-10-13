import { PermissionKey } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { basename, extname } from "node:path";
import { z } from "zod";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../utils/permissions.js";

export const knowledgeRouter = Router();
knowledgeRouter.use(
  authenticate,
  requirePermission(PermissionKey.MANAGE_KNOWLEDGE),
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const allowed = new Set([
      ".txt",
      ".doc",
      ".docx",
      ".rtf",
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
    ]);
    if (allowed.has(extension)) callback(null, true);
    else callback(new Error("Недопустимый тип файла"));
  },
});

const parseUploads: RequestHandler = (req, res, next) => {
  upload.array("files", 5)(req, res, (error: unknown) => {
    if (!error) return next();
    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Размер одного файла не должен превышать 10 МБ"
        : error instanceof multer.MulterError && error.code === "LIMIT_FILE_COUNT"
          ? "К статье можно прикрепить не более 5 файлов за раз"
          : error instanceof Error
            ? error.message
            : "Не удалось загрузить файлы";
    res.status(400).json({ message });
  });
};

const idSchema = z.coerce.number().int().positive();
const sectionInput = z.object({
  name: z.string().trim().min(2).max(160),
  parentId: idSchema.nullable().optional(),
  position: z.number().int().min(0).optional(),
});
const articleInput = z.object({
  sectionId: idSchema,
  title: z.string().trim().min(2).max(240),
  body: z.string().max(900_000),
  position: z.number().int().min(0).optional(),
});

knowledgeRouter.get("/sections", async (_req, res) => {
  res.json(
    await prisma.knowledgeSection.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { children: true, articles: true } },
      },
    }),
  );
});

knowledgeRouter.post("/sections", async (req, res) => {
  const body = sectionInput.parse(req.body);
  if (body.parentId) {
    const parent = await prisma.knowledgeSection.findUnique({
      where: { id: body.parentId },
      select: { id: true },
    });
    if (!parent) return res.status(404).json({ message: "Раздел не найден" });
  }
  res.status(201).json(
    await prisma.knowledgeSection.create({
      data: { ...body, createdByUserId: req.auth!.userId },
      include: { _count: { select: { children: true, articles: true } } },
    }),
  );
});

knowledgeRouter.patch("/sections/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const body = sectionInput.partial().parse(req.body);
  if (body.parentId !== undefined) {
    if (body.parentId === id)
      return res.status(400).json({ message: "Раздел нельзя вложить в себя" });
    let parentId = body.parentId;
    while (parentId) {
      const parent = await prisma.knowledgeSection.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true },
      });
      if (!parent) return res.status(404).json({ message: "Раздел не найден" });
      if (parent.id === id)
        return res
          .status(400)
          .json({ message: "Нельзя вложить раздел в его подраздел" });
      parentId = parent.parentId;
    }
  }
  res.json(
    await prisma.knowledgeSection.update({
      where: { id },
      data: body,
      include: { _count: { select: { children: true, articles: true } } },
    }),
  );
});

knowledgeRouter.delete("/sections/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const section = await prisma.knowledgeSection.findUnique({
    where: { id },
    select: { _count: { select: { children: true, articles: true } } },
  });
  if (!section) return res.status(404).json({ message: "Раздел не найден" });
  if (section._count.children || section._count.articles)
    return res.status(409).json({
      message: "Сначала удалите или переместите статьи и подразделы",
    });
  await prisma.knowledgeSection.delete({ where: { id } });
  res.status(204).end();
});

knowledgeRouter.get("/articles", async (req, res) => {
  const sectionId = req.query.sectionId
    ? idSchema.parse(req.query.sectionId)
    : undefined;
  const search = z.string().trim().max(200).optional().parse(req.query.search);
  const articles = await prisma.knowledgeArticle.findMany({
    where: {
      ...(sectionId && { sectionId }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { body: { contains: search } },
        ],
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
  res.json(
    articles.map(({ body, ...article }) => ({
      ...article,
      excerpt: body.replace(/\s+/g, " ").slice(0, 220),
    })),
  );
});

knowledgeRouter.post("/articles", async (req, res) => {
  const body = articleInput.parse(req.body);
  const section = await prisma.knowledgeSection.findUnique({
    where: { id: body.sectionId },
    select: { id: true },
  });
  if (!section) return res.status(404).json({ message: "Раздел не найден" });
  res.status(201).json(
    await prisma.knowledgeArticle.create({
      data: { ...body, createdByUserId: req.auth!.userId },
      select: { id: true, sectionId: true, title: true, updatedAt: true },
    }),
  );
});

knowledgeRouter.get("/articles/:id", async (req, res) => {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: idSchema.parse(req.params.id) },
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
  if (!article) return res.status(404).json({ message: "Статья не найдена" });
  res.json(article);
});

knowledgeRouter.patch("/articles/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const body = articleInput.partial().parse(req.body);
  if (body.sectionId) {
    const section = await prisma.knowledgeSection.findUnique({
      where: { id: body.sectionId },
      select: { id: true },
    });
    if (!section) return res.status(404).json({ message: "Раздел не найден" });
  }
  res.json(
    await prisma.knowledgeArticle.update({
      where: { id },
      data: body,
      select: { id: true, sectionId: true, title: true, updatedAt: true },
    }),
  );
});

knowledgeRouter.delete("/articles/:id", async (req, res) => {
  await prisma.knowledgeArticle.delete({
    where: { id: idSchema.parse(req.params.id) },
  });
  res.status(204).end();
});

knowledgeRouter.post(
  "/articles/:id/attachments",
  parseUploads,
  async (req, res) => {
    const articleId = idSchema.parse(req.params.id);
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: articleId },
      select: { id: true },
    });
    if (!article) return res.status(404).json({ message: "Статья не найдена" });
    const files = (req.files ?? []) as Express.Multer.File[];
    const attachments = await Promise.all(
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
    res.status(201).json(attachments);
  },
);

knowledgeRouter.get("/attachments/:id/download", async (req, res) => {
  const attachment = await prisma.knowledgeAttachment.findUnique({
    where: { id: idSchema.parse(req.params.id) },
    select: { fileName: true, mimeType: true, data: true },
  });
  if (!attachment)
    return res.status(404).json({ message: "Файл не найден" });
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.attachment(attachment.fileName);
  res.type(attachment.mimeType);
  res.send(Buffer.from(attachment.data));
});

knowledgeRouter.delete("/attachments/:id", async (req, res) => {
  await prisma.knowledgeAttachment.delete({
    where: { id: idSchema.parse(req.params.id) },
  });
  res.status(204).end();
});
