import { PermissionKey } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { extname } from "node:path";
import { authenticate } from "../../shared/middleware/auth.js";
import { requirePermission } from "../../shared/middleware/authorization.js";
import { createKnowledgeControllers } from "./knowledge.controller.js";
import { createKnowledgeService } from "./knowledge.service.js";

export function createKnowledgeRouter(prisma: PrismaClient) {
  const router = Router();
  const controllers = createKnowledgeControllers(
    createKnowledgeService(prisma),
  );
  router.use(
    authenticate,
    requirePermission(PermissionKey.MANAGE_KNOWLEDGE, prisma),
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

  router.get("/sections", controllers.listSectionsController);
  router.post("/sections", controllers.createSectionController);
  router.patch("/sections/:id", controllers.updateSectionController);
  router.delete("/sections/:id", controllers.deleteSectionController);
  router.post("/import", parseImportFiles, controllers.importFilesController);
  router.get("/articles", controllers.listArticlesController);
  router.post("/articles", controllers.createArticleController);
  router.get("/articles/:id", controllers.getArticleController);
  router.patch("/articles/:id", controllers.updateArticleController);
  router.delete("/articles/:id", controllers.deleteArticleController);
  router.post(
    "/articles/:id/attachments",
    parseUploads,
    controllers.uploadAttachmentsController,
  );
  router.get(
    "/attachments/:id/download",
    controllers.downloadAttachmentController,
  );
  router.delete("/attachments/:id", controllers.deleteAttachmentController);

  return router;
}
