import { PermissionKey } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import mammoth from "mammoth";
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

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    if (extension === ".txt" || extension === ".docx") callback(null, true);
    else callback(new Error("Импорт поддерживает только файлы .txt и .docx"));
  },
});

const parseImportFiles: RequestHandler = (req, res, next) => {
  importUpload.array("files", 20)(req, res, (error: unknown) => {
    if (!error) return next();
    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Размер одного файла не должен превышать 10 МБ"
        : error instanceof multer.MulterError && error.code === "LIMIT_FILE_COUNT"
          ? "За один раз можно импортировать не более 20 файлов"
          : error instanceof Error
            ? error.message
            : "Не удалось загрузить файлы для импорта";
    res.status(400).json({ message });
  });
};

type ImportedImage = { buffer: Buffer; mimeType: string };

function decodeTextFile(buffer: Buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  if (buffer[0] === 0xfe && buffer[1] === 0xff)
    return new TextDecoder("utf-16be").decode(buffer.subarray(2));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1251").decode(buffer).replace(/^\uFEFF/, "");
  }
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#")) {
      const point = code.startsWith("#x")
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point)
        : "\uFFFD";
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

async function parseImportFile(file: Express.Multer.File) {
  if (extname(file.originalname).toLowerCase() === ".txt")
    return { body: decodeTextFile(file.buffer), images: [] as ImportedImage[] };

  const images: ImportedImage[] = [];
  const result = await mammoth.convertToHtml(
    { buffer: file.buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const index = images.length;
        images.push({ buffer: await image.read(), mimeType: image.contentType });
        return { src: `knowledge-image:${index}` };
      }),
    },
  );
  const body = result.value
    .replace(/<img\b[^>]*src=["']knowledge-image:(\d+)["'][^>]*>/gi, "\n[[import-image:$1]]\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|h[1-6]|li|tr|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity) => decodeHtmlEntities(entity))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { body, images };
}

function imageExtension(mimeType: string) {
  const extensions: Record<string, string> = {
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  return extensions[mimeType] ?? "bin";
}

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
        articles: {
          orderBy: [{ position: "asc" }, { title: "asc" }],
          select: { id: true, title: true },
        },
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

knowledgeRouter.post("/import", parseImportFiles, async (req, res) => {
  const sectionId = idSchema.parse(req.body.sectionId);
  const section = await prisma.knowledgeSection.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });
  if (!section) return res.status(404).json({ message: "Раздел не найден" });

  const files = (req.files ?? []) as Express.Multer.File[];
  if (!files.length)
    return res.status(400).json({ message: "Выберите файлы для импорта" });

  let imported = 0;
  let skipped = 0;
  const failed: { fileName: string; reason: string }[] = [];
  const submittedNames = Array.isArray(req.body.fileNames)
    ? req.body.fileNames
    : typeof req.body.fileNames === "string"
      ? [req.body.fileNames]
      : [];
  for (const [index, file] of files.entries()) {
    const submittedName = submittedNames[index];
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
            createdByUserId: req.auth!.userId,
          },
          select: { id: true },
        });
        let body = parsed.body;
        for (const [index, image] of parsed.images.entries()) {
          if (!image.mimeType.startsWith("image/"))
            throw new Error("DOCX содержит файл, который не распознан как изображение");
          const attachment = await transaction.knowledgeAttachment.create({
            data: {
              articleId: article.id,
              fileName: `image-${index + 1}.${imageExtension(image.mimeType)}`,
              mimeType: image.mimeType,
              size: image.buffer.length,
              data: Uint8Array.from(image.buffer),
            },
            select: { id: true },
          });
          body = body.replaceAll(`[[import-image:${index}]]`, `[[image:${attachment.id}]]`);
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
        reason: reason instanceof Error ? reason.message : "Не удалось обработать файл",
      });
    }
  }

  res.status(201).json({ imported, skipped, failed });
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
