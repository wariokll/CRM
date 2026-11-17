import { PermissionKey } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { extname } from "node:path";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import {
  createArticleController,
  createSectionController,
  deleteArticleController,
  deleteAttachmentController,
  deleteSectionController,
  downloadAttachmentController,
  getArticleController,
  importFilesController,
  listArticlesController,
  listSectionsController,
  updateArticleController,
  updateSectionController,
  uploadAttachmentsController,
} from "./knowledge.controller.js";

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
        : error instanceof multer.MulterError &&
            error.code === "LIMIT_FILE_COUNT"
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
        : error instanceof multer.MulterError &&
            error.code === "LIMIT_FILE_COUNT"
          ? "За один раз можно импортировать не более 20 файлов"
          : error instanceof Error
            ? error.message
            : "Не удалось загрузить файлы для импорта";
    res.status(400).json({ message });
  });
};

knowledgeRouter.get("/sections", listSectionsController);
knowledgeRouter.post("/sections", createSectionController);
knowledgeRouter.patch("/sections/:id", updateSectionController);
knowledgeRouter.delete("/sections/:id", deleteSectionController);
knowledgeRouter.post("/import", parseImportFiles, importFilesController);
knowledgeRouter.get("/articles", listArticlesController);
knowledgeRouter.post("/articles", createArticleController);
knowledgeRouter.get("/articles/:id", getArticleController);
knowledgeRouter.patch("/articles/:id", updateArticleController);
knowledgeRouter.delete("/articles/:id", deleteArticleController);
knowledgeRouter.post(
  "/articles/:id/attachments",
  parseUploads,
  uploadAttachmentsController,
);
knowledgeRouter.get("/attachments/:id/download", downloadAttachmentController);
knowledgeRouter.delete("/attachments/:id", deleteAttachmentController);
