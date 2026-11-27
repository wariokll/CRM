import { useRef, useState, type Dispatch, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { knowledgeRequest } from "../queries";
import { queryKeys } from "../../../shared/queryKeys";
import { useKnowledgeImport } from "./useKnowledgeImport";
import { errorText } from "../knowledge-page-data";
import type { KnowledgeArticle, KnowledgeSection } from "../../../types";
import { useKnowledgeAttachments } from "./useKnowledgeAttachments";
import { useKnowledgeArticleSave } from "./useKnowledgeArticleSave";

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
  const [busy, setBusy] = useState(false);
  const bodyEditorRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const knowledgeImport = useKnowledgeImport({
    sections,
    activeSectionId,
    setArticle,
    setSearch,
    reloadSections,
    setError,
    setBusy,
  });
  const attachments = useKnowledgeAttachments({
    article,
    openArticle,
    setError,
  });
  const saveArticle = useKnowledgeArticleSave({
    articleDialog,
    pendingFiles,
    setArticleDialog,
    setActiveSectionId,
    setBusy,
    setError,
    reloadSections,
    openArticle,
  });

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

  return {
    sectionDialog,
    setSectionDialog,
    articleDialog,
    setArticleDialog,
    ...knowledgeImport,
    pendingFiles,
    setPendingFiles,
    imageUrls: attachments.imageUrls,
    busy,
    bodyEditorRef,
    downloadAttachment: attachments.downloadAttachment,
    uploadAttachments: attachments.uploadAttachments,
    editArticle,
    insertImageMarker,
    addArticleFiles,
    saveSection,
    deleteSection,
    saveArticle,
    deleteArticle,
    deleteAttachment: attachments.deleteAttachment,
  };
}
