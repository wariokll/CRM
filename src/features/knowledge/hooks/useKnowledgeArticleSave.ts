import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { knowledgeRequest, useKnowledgeMutation } from "../queries";
import { queryKeys } from "../../../shared/queryKeys";
import { errorText } from "../knowledge-page-data";
import type { KnowledgeArticle, KnowledgeAttachment } from "../../../types";

type KnowledgeArticleSaveOptions = {
  articleDialog: KnowledgeArticle | "new" | null;
  pendingFiles: File[];
  setArticleDialog: (value: KnowledgeArticle | "new" | null) => void;
  setActiveSectionId: (id: number | null) => void;
  setBusy: (busy: boolean) => void;
  setError: (message: string) => void;
  reloadSections: (selectId?: number | null) => Promise<void>;
  openArticle: (id: number) => Promise<void>;
};

export function useKnowledgeArticleSave({
  articleDialog,
  pendingFiles,
  setArticleDialog,
  setActiveSectionId,
  setBusy,
  setError,
  reloadSections,
  openArticle,
}: KnowledgeArticleSaveOptions) {
  const queryClient = useQueryClient();
  const knowledgeMutation = useKnowledgeMutation();

  const saveArticle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const isNew = articleDialog === "new";
    const body = {
      sectionId: Number(form.get("sectionId")),
      title: String(form.get("title") ?? ""),
      body: String(form.get("body") ?? ""),
    };
    const files = pendingFiles;
    try {
      const saved = await knowledgeRequest<{ id: number; sectionId: number }>(
        isNew
          ? "/knowledge/articles"
          : `/knowledge/articles/${articleDialog!.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          body: JSON.stringify({
            ...body,
            body: body.body.replace(/\[\[image:pending:\d+\]\]/g, ""),
          }),
        },
      );
      let finalBody = body.body;
      if (files.length) {
        const upload = new FormData();
        files.forEach((file) => upload.append("files", file));
        const uploaded = await knowledgeRequest<KnowledgeAttachment[]>(
          `/knowledge/articles/${saved.id}/attachments`,
          { method: "POST", body: upload },
        );
        finalBody = replacePendingImageMarkers(body.body, uploaded, files);
        if (finalBody !== body.body.replace(/\[\[image:pending:\d+\]\]/g, ""))
          await knowledgeMutation.mutateAsync({
            path: `/knowledge/articles/${saved.id}`,
            init: {
              method: "PATCH",
              body: JSON.stringify({ body: finalBody }),
            },
          });
      }
      setArticleDialog(null);
      setActiveSectionId(saved.sectionId);
      await reloadSections(saved.sectionId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.knowledge.articles,
      });
      await openArticle(saved.id);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return saveArticle;
}

function replacePendingImageMarkers(
  body: string,
  attachments: KnowledgeAttachment[],
  files: File[],
) {
  return files.reduce((current, file, index) => {
    const attachment = attachments[index];
    if (!file.type.startsWith("image/") || !attachment) return current;
    return current.replaceAll(
      `[[image:pending:${index}]]`,
      `[[image:${attachment.id}]]`,
    );
  }, body);
}
