import { KnowledgeArticleDialog } from "./KnowledgeArticleDialog";
import { KnowledgeSectionDialog } from "./KnowledgeSectionDialog";
import type { KnowledgeEditDialogProps } from "../types/knowledge-edit";

export function KnowledgeEditDialogs(props: KnowledgeEditDialogProps) {
  return (
    <>
      <KnowledgeSectionDialog {...props} />
      <KnowledgeArticleDialog {...props} />
    </>
  );
}
