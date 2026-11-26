import { knowledgeRequest } from "./queries";
import type { KnowledgeArticleSummary, KnowledgeSection } from "../../types";

export function errorText(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Не удалось выполнить действие";
}

export async function loadKnowledgeSections() {
  const sections = await knowledgeRequest<KnowledgeSection[]>(
    "/knowledge/sections",
  );
  if (sections.every((section) => Array.isArray(section.articles)))
    return sections;

  const articles = await knowledgeRequest<KnowledgeArticleSummary[]>(
    "/knowledge/articles",
  );
  const articlesBySection = new Map<number, { id: number; title: string }[]>();
  for (const article of articles) {
    const sectionArticles = articlesBySection.get(article.sectionId) ?? [];
    sectionArticles.push({ id: article.id, title: article.title });
    articlesBySection.set(article.sectionId, sectionArticles);
  }

  return sections.map((section) => ({
    ...section,
    articles: Array.isArray(section.articles)
      ? section.articles
      : (articlesBySection.get(section.id) ?? []),
  }));
}
