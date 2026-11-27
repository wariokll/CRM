import { useKnowledgeEditor } from "./useKnowledgeEditor";
import { useKnowledgeSelection } from "./useKnowledgeSelection";

export function useKnowledgePage() {
  const selection = useKnowledgeSelection();
  const editor = useKnowledgeEditor(selection);

  return { ...selection, ...editor };
}
