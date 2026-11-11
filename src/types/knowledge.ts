export interface KnowledgeSection {
  id: number;
  name: string;
  parentId: number | null;
  position: number;
  _count: { children: number; articles: number };
  articles: { id: number; title: string }[];
}

export interface KnowledgeArticleSummary {
  id: number;
  sectionId: number;
  title: string;
  position: number;
  updatedAt: string;
  section: { name: string };
  excerpt: string;
}

export interface KnowledgeAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface KnowledgeArticle extends KnowledgeArticleSummary {
  body: string;
  section: { id: number; name: string };
  attachments: KnowledgeAttachment[];
}
