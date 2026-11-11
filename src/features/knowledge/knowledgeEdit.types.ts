import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import type { KnowledgeArticle, KnowledgeSection } from "../../types";

export type KnowledgeEditDialogProps = {
  sectionDialog: KnowledgeSection | "new" | null;
  setSectionDialog: Dispatch<SetStateAction<KnowledgeSection | "new" | null>>;
  articleDialog: KnowledgeArticle | "new" | null;
  setArticleDialog: Dispatch<SetStateAction<KnowledgeArticle | "new" | null>>;
  sections: KnowledgeSection[];
  error: string;
  busy: boolean;
  saveSection: (event: FormEvent<HTMLFormElement>) => void;
  saveArticle: (event: FormEvent<HTMLFormElement>) => void;
  activeSectionId: number | null;
  bodyEditorRef: RefObject<HTMLTextAreaElement | null>;
  addArticleFiles: (files: File[]) => void;
  pendingFiles: File[];
  setPendingFiles: Dispatch<SetStateAction<File[]>>;
  insertImageMarker: (marker: string) => void;
  formatSize: (size: number) => string;
};
