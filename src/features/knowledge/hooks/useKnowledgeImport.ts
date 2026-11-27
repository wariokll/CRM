import { useRef, useState, type Dispatch, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { knowledgeRequest } from "../queries";
import { queryKeys } from "../../../shared/queryKeys";
import { errorText } from "../knowledge-page-data";
import type { KnowledgeImportResult } from "../components/KnowledgeImportDialog";
import type { KnowledgeArticle, KnowledgeSection } from "../../../types";

type KnowledgeImportOptions = {
  sections: KnowledgeSection[];
  activeSectionId: number | null;
  setArticle: Dispatch<KnowledgeArticle | null>;
  setSearch: (value: string) => void;
  reloadSections: (selectId?: number | null) => Promise<void>;
  setError: (message: string) => void;
  setBusy: (busy: boolean) => void;
};

export function useKnowledgeImport({
  sections,
  activeSectionId,
  setArticle,
  setSearch,
  reloadSections,
  setError,
  setBusy,
}: KnowledgeImportOptions) {
  const [importDialog, setImportDialog] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importSectionId, setImportSectionId] = useState<number | null>(null);
  const [importResult, setImportResult] =
    useState<KnowledgeImportResult | null>(null);
  const importFilesRef = useRef<HTMLInputElement>(null);
  const importFolderRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const openImport = () => {
    setImportFiles([]);
    setImportSectionId(activeSectionId ?? sections[0]?.id ?? null);
    setImportResult(null);
    setError("");
    setImportDialog(true);
  };

  const selectImportFiles = (files: File[]) => {
    if (files.length > 20) {
      setImportFiles([]);
      setImportResult(null);
      setError("За один раз можно выбрать не более 20 файлов.");
      return;
    }
    const unsupported = files.find((file) => !/\.(txt|docx)$/i.test(file.name));
    if (unsupported) {
      setImportFiles([]);
      setImportResult(null);
      setError(`Формат файла «${unsupported.name}» не поддерживается.`);
      return;
    }
    setError("");
    setImportResult(null);
    setImportFiles(files);
  };

  const importKnowledgeFiles = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!importFiles.length || !importSectionId) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("sectionId", String(importSectionId));
    importFiles.forEach((file) => {
      form.append("files", file);
      form.append("fileNames", file.name);
    });
    try {
      const result = await knowledgeRequest<KnowledgeImportResult>(
        "/knowledge/import",
        { method: "POST", body: form },
      );
      setImportResult(result);
      setArticle(null);
      setSearch("");
      await reloadSections(importSectionId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.knowledge.articles,
      });
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return {
    importDialog,
    setImportDialog,
    importFiles,
    setImportFiles,
    importSectionId,
    setImportSectionId,
    importResult,
    setImportResult,
    importFilesRef,
    importFolderRef,
    openImport,
    selectImportFiles,
    importKnowledgeFiles,
  };
}
