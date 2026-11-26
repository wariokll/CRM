import { basename, extname } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { imageExtension, parseImportFile } from "./import-parser.js";
import { KnowledgeServiceError } from "./knowledge.errors.js";

export function createKnowledgeImportService(prisma: PrismaClient) {
  async function persistImportedArticle(
    sectionId: number,
    userId: number,
    title: string,
    parsed: Awaited<ReturnType<typeof parseImportFile>>,
  ) {
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
  }

  async function importOneKnowledgeFile(
    sectionId: number,
    userId: number,
    file: Express.Multer.File,
    submittedName: unknown,
  ) {
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
        return "skipped" as const;
      }
      const parsed = await parseImportFile(file);
      if (!parsed.body.trim()) throw new Error("В документе не найден текст");
      if (parsed.body.length > 900_000)
        throw new Error("Извлечённый текст превышает допустимый размер статьи");
      await persistImportedArticle(sectionId, userId, title, parsed);
      return "imported" as const;
    } catch (reason) {
      return {
        status: "failed" as const,
        fileName,
        reason:
          reason instanceof Error
            ? reason.message
            : "Не удалось обработать файл",
      };
    }
  }

  async function importFiles(
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
      const result = await importOneKnowledgeFile(
        sectionId,
        userId,
        file,
        names[index],
      );
      if (result === "imported") imported += 1;
      else if (result === "skipped") skipped += 1;
      else failed.push(result);
    }
    return { imported, skipped, failed };
  }
  return { importFiles };
}
