import type { Request, Response } from "express";
import {
  articleInputSchema,
  articleSearchSchema,
  knowledgeIdSchema,
  sectionInputSchema,
} from "./knowledge.contracts.js";
import {
  KnowledgeServiceError,
  type createKnowledgeService,
} from "./knowledge.service.js";

async function sendResult(
  res: Response,
  operation: () => Promise<unknown>,
  status = 200,
) {
  try {
    return res.status(status).json(await operation());
  } catch (error) {
    if (error instanceof KnowledgeServiceError)
      return res.status(error.status).json({ message: error.message });
    throw error;
  }
}

export function createKnowledgeControllers(
  service: ReturnType<typeof createKnowledgeService>,
) {
  const {
    createArticle,
    createSection,
    deleteArticle,
    deleteAttachment,
    deleteSection,
    getArticle,
    getAttachment,
    importFiles,
    listArticles,
    listSections,
    updateArticle,
    updateSection,
    uploadAttachments,
  } = service;

  async function listSectionsController(_req: Request, res: Response) {
    return sendResult(res, listSections);
  }

  async function createSectionController(req: Request, res: Response) {
    const input = sectionInputSchema.parse(req.body);
    return sendResult(res, () => createSection(input, req.auth!.userId), 201);
  }

  async function updateSectionController(req: Request, res: Response) {
    const id = knowledgeIdSchema.parse(req.params.id);
    const input = sectionInputSchema.partial().parse(req.body);
    return sendResult(res, () => updateSection(id, input));
  }

  async function deleteSectionController(req: Request, res: Response) {
    const id = knowledgeIdSchema.parse(req.params.id);
    try {
      await deleteSection(id);
      return res.status(204).end();
    } catch (error) {
      if (error instanceof KnowledgeServiceError)
        return res.status(error.status).json({ message: error.message });
      throw error;
    }
  }

  async function importFilesController(req: Request, res: Response) {
    const sectionId = knowledgeIdSchema.parse(req.body.sectionId);
    const files = (req.files ?? []) as Express.Multer.File[];
    return sendResult(
      res,
      () => importFiles(sectionId, req.auth!.userId, files, req.body.fileNames),
      201,
    );
  }

  async function listArticlesController(req: Request, res: Response) {
    const sectionId = req.query.sectionId
      ? knowledgeIdSchema.parse(req.query.sectionId)
      : undefined;
    const search = articleSearchSchema.parse(req.query.search);
    return sendResult(res, () => listArticles(sectionId, search));
  }

  async function createArticleController(req: Request, res: Response) {
    const input = articleInputSchema.parse(req.body);
    return sendResult(res, () => createArticle(input, req.auth!.userId), 201);
  }

  async function getArticleController(req: Request, res: Response) {
    const id = knowledgeIdSchema.parse(req.params.id);
    return sendResult(res, () => getArticle(id));
  }

  async function updateArticleController(req: Request, res: Response) {
    const id = knowledgeIdSchema.parse(req.params.id);
    const input = articleInputSchema.partial().parse(req.body);
    return sendResult(res, () => updateArticle(id, input));
  }

  async function deleteArticleController(req: Request, res: Response) {
    const id = knowledgeIdSchema.parse(req.params.id);
    await deleteArticle(id);
    return res.status(204).end();
  }

  async function uploadAttachmentsController(req: Request, res: Response) {
    const articleId = knowledgeIdSchema.parse(req.params.id);
    const files = (req.files ?? []) as Express.Multer.File[];
    return sendResult(res, () => uploadAttachments(articleId, files), 201);
  }

  async function downloadAttachmentController(req: Request, res: Response) {
    const attachment = await getAttachment(
      knowledgeIdSchema.parse(req.params.id),
    ).catch((error: unknown) => {
      if (error instanceof KnowledgeServiceError) {
        res.status(error.status).json({ message: error.message });
        return null;
      }
      throw error;
    });
    if (!attachment) return;
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.attachment(attachment.fileName);
    res.type(attachment.mimeType);
    return res.send(Buffer.from(attachment.data));
  }

  async function deleteAttachmentController(req: Request, res: Response) {
    await deleteAttachment(knowledgeIdSchema.parse(req.params.id));
    return res.status(204).end();
  }

  return {
    listSectionsController,
    createSectionController,
    updateSectionController,
    deleteSectionController,
    importFilesController,
    listArticlesController,
    createArticleController,
    getArticleController,
    updateArticleController,
    deleteArticleController,
    uploadAttachmentsController,
    downloadAttachmentController,
    deleteAttachmentController,
  };
}
