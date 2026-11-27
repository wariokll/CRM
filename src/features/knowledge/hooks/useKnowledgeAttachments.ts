import { useEffect, useState } from "react";
import {
  downloadKnowledgeFile,
  knowledgeRequest,
  useKnowledgeAttachmentMutation,
} from "../queries";
import { errorText } from "../knowledge-page-data";
import type { KnowledgeArticle, KnowledgeAttachment } from "../../../types";

type KnowledgeAttachmentOptions = {
  article: KnowledgeArticle | null;
  openArticle: (id: number) => Promise<void>;
  setError: (message: string) => void;
};

export function useKnowledgeAttachments({
  article,
  openArticle,
  setError,
}: KnowledgeAttachmentOptions) {
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const attachmentMutation = useKnowledgeAttachmentMutation();

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setImageUrls({});
    if (!article) return;
    for (const attachment of article.attachments) {
      if (!attachment.mimeType.startsWith("image/")) continue;
      void downloadKnowledgeFile(
        `/knowledge/attachments/${attachment.id}/download`,
      )
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          if (cancelled) URL.revokeObjectURL(url);
          else {
            urls.push(url);
            setImageUrls((current) => ({ ...current, [attachment.id]: url }));
          }
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [article]);

  const downloadAttachment = async (attachment: KnowledgeAttachment) => {
    setError("");
    try {
      const blob = await downloadKnowledgeFile(
        `/knowledge/attachments/${attachment.id}/download`,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(errorText(reason));
    }
  };

  const uploadAttachments = async (articleId: number, files: File[]) => {
    await attachmentMutation.mutateAsync({ articleId, files });
    await openArticle(articleId);
  };

  const deleteAttachment = async (attachment: KnowledgeAttachment) => {
    if (!article || !window.confirm(`Удалить файл «${attachment.fileName}»?`))
      return;
    try {
      await knowledgeRequest<void>(`/knowledge/attachments/${attachment.id}`, {
        method: "DELETE",
      });
      await openArticle(article.id);
    } catch (reason) {
      setError(errorText(reason));
    }
  };

  return { imageUrls, downloadAttachment, uploadAttachments, deleteAttachment };
}
