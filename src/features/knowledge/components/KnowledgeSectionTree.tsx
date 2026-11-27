import { BookOpen, FileText } from "lucide-react";
import type { KnowledgeArticle, KnowledgeSection } from "../../../types";

type KnowledgeSectionTreeProps = {
  sections: KnowledgeSection[];
  activeSectionId: number | null;
  article: KnowledgeArticle | null;
  search: string;
  setActiveSectionId: (id: number | null) => void;
  setArticle: (article: KnowledgeArticle | null) => void;
  setSearch: (value: string) => void;
  openArticle: (id: number) => Promise<void>;
};

export function KnowledgeSectionTree({
  sections,
  activeSectionId,
  article,
  search,
  setActiveSectionId,
  setArticle,
  setSearch,
  openArticle,
}: KnowledgeSectionTreeProps) {
  const articleCounts = new Map(
    sections.map((section) => [section.id, section.articles.length]),
  );
  for (const section of sections) {
    let parentId = section.parentId;
    while (parentId !== null) {
      articleCounts.set(
        parentId,
        (articleCounts.get(parentId) ?? 0) + section.articles.length,
      );
      parentId =
        sections.find((item) => item.id === parentId)?.parentId ?? null;
    }
  }

  const renderSection = (section: KnowledgeSection, depth = 0) => (
    <div key={section.id}>
      <button
        className={activeSectionId === section.id && !search ? "active" : ""}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          setSearch("");
          setArticle(null);
          setActiveSectionId(section.id);
        }}
      >
        <BookOpen size={14} />
        <span>{section.name}</span>
        <small>{articleCounts.get(section.id) ?? 0}</small>
      </button>
      {section.articles.map((item) => (
        <button
          className={`knowledge-tree-article${article?.id === item.id ? " active" : ""}`}
          key={item.id}
          style={{ paddingLeft: 24 + depth * 14 }}
          onClick={() => {
            setSearch("");
            setActiveSectionId(section.id);
            void openArticle(item.id);
          }}
        >
          <FileText size={13} />
          <span>{item.title}</span>
        </button>
      ))}
      {sections
        .filter((item) => item.parentId === section.id)
        .map((child) => renderSection(child, depth + 1))}
    </div>
  );

  return (
    <div className="knowledge-tree">
      <button
        className={activeSectionId === null && !search ? "active" : ""}
        onClick={() => {
          setSearch("");
          setArticle(null);
          setActiveSectionId(null);
        }}
      >
        <BookOpen size={14} />
        <span>Все статьи</span>
        <small>
          {sections.reduce((sum, item) => sum + item.articles.length, 0)}
        </small>
      </button>
      {sections
        .filter((item) => item.parentId === null)
        .map((item) => renderSection(item))}
    </div>
  );
}
