import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  downloadKnowledgeFile,
  knowledgeRequest,
  useKnowledgeAttachmentMutation,
  useKnowledgeMutation,
} from "./queries";
import { queryKeys } from "../../shared/queryKeys";
import { useKnowledgeImport } from "./useKnowledgeImport";
import type {
  KnowledgeArticle,
  KnowledgeAttachment,
  KnowledgeSection,
} from "../../types";

function errorText(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Не удалось выполнить действие";
}

type KnowledgeEditorOptions = {
  sections: KnowledgeSection[];
  activeSectionId: number | null;
  setActiveSectionId: (id: number | null) => void;
  article: KnowledgeArticle | null;
  setArticle: Dispatch<KnowledgeArticle | null>;
  setSearch: (value: string) => void;
  goToArticleList: () => void;
  openArticle: (id: number) => Promise<void>;
  reloadSections: (selectId?: number | null) => Promise<void>;
  setError: (message: string) => void;
};

export function useKnowledgeEditor({
  sections,
  activeSectionId,
  setActiveSectionId,
  article,
  setArticle,
  setSearch,
  goToArticleList,
  openArticle,
  reloadSections,
  setError,
}: KnowledgeEditorOptions) {
  const [sectionDialog, setSectionDialog] = useState<
    KnowledgeSection | "new" | null
  >(null);
  const [articleDialog, setArticleDialog] = useState<
    KnowledgeArticle | "new" | null
  >(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const bodyEditorRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const knowledgeMutation = useKnowledgeMutation();
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

  const knowledgeImport = useKnowledgeImport({
    sections,
    activeSectionId,
    setArticle,
    setSearch,
    reloadSections,
    setError,
    setBusy,
  });
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

  const editArticle = (value: KnowledgeArticle | "new") => {
    setPendingFiles([]);
    setError("");
    setArticleDialog(value);
  };

  const insertImageMarker = (marker: string) => {
    const editor = bodyEditorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const prefix = start > 0 && editor.value[start - 1] !== "\n" ? "\n" : "";
    const suffix = editor.value[end] !== "\n" ? "\n" : "";
    editor.setRangeText(`${prefix}${marker}${suffix}`, start, end, "end");
    editor.focus();
  };

  const addArticleFiles = (files: File[]) => {
    if (pendingFiles.length + files.length > 5) {
      setError("К статье можно прикрепить не более 5 файлов за раз.");
      return;
    }
    setError("");
    setPendingFiles((current) => [...current, ...files]);
  };

  const saveSection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") ?? "");
    const parent = String(values.get("parentId") ?? "");
    const body = { name, parentId: parent ? Number(parent) : null };
    try {
      const isNew = sectionDialog === "new";
      const saved = await knowledgeRequest<KnowledgeSection>(
        isNew
          ? "/knowledge/sections"
          : `/knowledge/sections/${sectionDialog!.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          body: JSON.stringify(body),
        },
      );
      setSectionDialog(null);
      await reloadSections(isNew ? saved.id : activeSectionId);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  const deleteSection = async (section: KnowledgeSection) => {
    if (!window.confirm(`Удалить раздел «${section.name}»?`)) return;
    setError("");
    try {
      await knowledgeRequest<void>(`/knowledge/sections/${section.id}`, {
        method: "DELETE",
      });
      await reloadSections(
        activeSectionId === section.id ? null : activeSectionId,
      );
    } catch (reason) {
      setError(errorText(reason));
    }
  };

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
          {
            method: "POST",
            body: upload,
          },
        );
        files.forEach((file, index) => {
          const attachment = uploaded[index];
          if (file.type.startsWith("image/") && attachment)
            finalBody = finalBody.replaceAll(
              `[[image:pending:${index}]]`,
              `[[image:${attachment.id}]]`,
            );
        });
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

  const deleteArticle = async (item: KnowledgeArticle) => {
    if (!window.confirm(`Удалить статью «${item.title}» и её вложения?`))
      return;
    try {
      await knowledgeRequest<void>(`/knowledge/articles/${item.id}`, {
        method: "DELETE",
      });
      goToArticleList();
      await reloadSections(activeSectionId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.knowledge.articles,
      });
    } catch (reason) {
      setError(errorText(reason));
    }
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

  return {
    sectionDialog,
    setSectionDialog,
    articleDialog,
    setArticleDialog,
    ...knowledgeImport,
    pendingFiles,
    setPendingFiles,
    imageUrls,
    busy,
    bodyEditorRef,
    downloadAttachment,
    uploadAttachments,
    editArticle,
    insertImageMarker,
    addArticleFiles,
    saveSection,
    deleteSection,
    saveArticle,
    deleteArticle,
    deleteAttachment,
  };
}
