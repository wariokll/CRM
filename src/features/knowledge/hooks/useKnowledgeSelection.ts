import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { knowledgeRequest } from "../queries";
import { queryKeys } from "../../../shared/queryKeys";
import { errorText, loadKnowledgeSections } from "../knowledge-page-data";
import type { KnowledgeArticle, KnowledgeArticleSummary } from "../../../types";

export function useKnowledgeSelection() {
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

  return {
    activeSectionId,
    setActiveSectionId,
    goToArticleList,
    article,
    setArticle,
    search,
    setSearch,
    error,
    setError,
    sections,
    articles,
    openArticle,
    reloadSections,
    currentSection: sections.find((item) => item.id === activeSectionId),
  };
}
