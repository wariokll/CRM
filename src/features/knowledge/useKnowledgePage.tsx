import { BookOpen, FileText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { knowledgeRequest } from "./queries";
import { queryKeys } from "../../shared/queryKeys";
import { useKnowledgeEditor } from "./useKnowledgeEditor";
import type {
  KnowledgeArticle,
  KnowledgeArticleSummary,
  KnowledgeSection,
} from "../../types";

function errorText(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Не удалось выполнить действие";
}

async function loadKnowledgeSections() {
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

export function useKnowledgePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get("sectionId");
  const sectionFromUrl =
    sectionParam && sectionParam !== "all"
      ? Number(sectionParam) || null
      : null;
  const searchFromUrl = searchParams.get("search") ?? "";
  const articleIdFromUrl = Number(searchParams.get("articleId")) || null;
  const [activeSectionId, setActiveSectionLocal] = useState<number | null>(
    sectionFromUrl,
  );
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [search, setSearchLocal] = useState(searchFromUrl);
  const [error, setError] = useState("");

  const queryClient = useQueryClient();
  const setActiveSectionId = useCallback(
    (id: number | null) => {
      setActiveSectionLocal(id);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("sectionId", id === null ? "all" : String(id));
          next.delete("articleId");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const setSearch = (value: string) => {
    setSearchLocal(value);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set("search", value);
        else next.delete("search");
        next.delete("articleId");
        return next;
      },
      { replace: true },
    );
  };
  const goToArticleList = useCallback(() => {
    setArticle(null);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("articleId");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);
  useEffect(() => {
    setActiveSectionLocal(sectionFromUrl);
    setSearchLocal(searchFromUrl);
  }, [sectionFromUrl, searchFromUrl]);
  const sectionsQuery = useQuery({
    queryKey: queryKeys.knowledge.sections,
    queryFn: loadKnowledgeSections,
  });
  const sections = useMemo(
    () => sectionsQuery.data ?? [],
    [sectionsQuery.data],
  );
  const articlesQuery = useQuery({
    queryKey: queryKeys.knowledge.articleList(activeSectionId, search.trim()),
    queryFn: async () => {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      else if (activeSectionId) query.set("sectionId", String(activeSectionId));
      const suffix = query.size ? `?${query.toString()}` : "";
      return knowledgeRequest<KnowledgeArticleSummary[]>(
        `/knowledge/articles${suffix}`,
      );
    },
  });
  const articles = articlesQuery.data ?? [];
  useEffect(() => {
    if (!sectionsQuery.isSuccess) return;
    if (activeSectionId === null && sectionParam !== "all" && sections.length)
      setActiveSectionId(sections[0]?.id ?? null);
    if (
      activeSectionId !== null &&
      !sections.some((section) => section.id === activeSectionId)
    )
      setActiveSectionId(sections[0]?.id ?? null);
  }, [
    activeSectionId,
    sectionParam,
    sections,
    sectionsQuery.isSuccess,
    setActiveSectionId,
    goToArticleList,
  ]);
  useEffect(() => {
    if (sectionsQuery.error) setError(errorText(sectionsQuery.error));
    if (articlesQuery.error) setError(errorText(articlesQuery.error));
  }, [sectionsQuery.error, articlesQuery.error]);

  const reloadSections = async (selectId?: number | null) => {
    const items = await queryClient.fetchQuery({
      queryKey: queryKeys.knowledge.sections,
      queryFn: loadKnowledgeSections,
      staleTime: 0,
    });
    if (selectId !== undefined) setActiveSectionId(selectId);
    else if (
      activeSectionId &&
      !items.some((item) => item.id === activeSectionId)
    )
      setActiveSectionId(items[0]?.id ?? null);
  };

  const openArticle = useCallback(
    async (id: number) => {
      setError("");
      const sectionId =
        sections.find((section) =>
          section.articles.some((item) => item.id === id),
        )?.id ?? activeSectionId;
      if (searchParams.get("articleId") !== String(id))
        setSearchParams(
          (current) => {
            const next = new URLSearchParams(current);
            next.set("articleId", String(id));
            if (sectionId !== null) next.set("sectionId", String(sectionId));
            next.delete("search");
            return next;
          },
          { replace: false },
        );
      setSearchLocal("");
      if (sectionId !== null) setActiveSectionLocal(sectionId);
      try {
        setArticle(
          await queryClient.fetchQuery({
            queryKey: queryKeys.knowledge.article(id),
            queryFn: () =>
              knowledgeRequest<KnowledgeArticle>(`/knowledge/articles/${id}`),
          }),
        );
      } catch (reason) {
        setError(errorText(reason));
      }
    },
    [activeSectionId, queryClient, searchParams, sections, setSearchParams],
  );

  useEffect(() => {
    if (!articleIdFromUrl) {
      setArticle(null);
      return;
    }
    let active = true;
    setError("");
    void queryClient
      .fetchQuery({
        queryKey: queryKeys.knowledge.article(articleIdFromUrl),
        queryFn: () =>
          knowledgeRequest<KnowledgeArticle>(
            `/knowledge/articles/${articleIdFromUrl}`,
          ),
      })
      .then((loadedArticle) => {
        if (!active) return;
        setArticle(loadedArticle);
        setActiveSectionLocal(loadedArticle.sectionId);
        setSearchLocal("");
      })
      .catch((reason: unknown) => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [articleIdFromUrl, queryClient]);

  const editor = useKnowledgeEditor({
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
  });

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

  const renderSection = (section: KnowledgeSection, depth = 0): ReactNode => (
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

  const currentSection = sections.find((item) => item.id === activeSectionId);

  return {
    activeSectionId,
    setActiveSectionId,
    goToArticleList,
    article,
    setArticle,
    search,
    setSearch,
    ...editor,
    error,
    setError,
    sections,
    articles,
    openArticle,
    renderSection,
    currentSection,
  };
}
