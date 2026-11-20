import { BookOpen, FileText, FolderPlus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  downloadKnowledgeFile,
  knowledgeRequest,
  uploadKnowledgeAttachments,
} from "./queries";
import { queryKeys } from "../../shared/queryKeys";
import { KnowledgeImportDialog } from "./KnowledgeImportDialog";
import { KnowledgeEditDialogs } from "./KnowledgeEditDialogs";
import { KnowledgeArticleView } from "./KnowledgeArticleView";
import { KnowledgeArticleList } from "./KnowledgeArticleList";
import type { KnowledgeImportResult } from "./KnowledgeImportDialog";
import type {
  KnowledgeArticle,
  KnowledgeArticleSummary,
  KnowledgeAttachment,
  KnowledgeSection,
} from "../../types";

function errorText(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Не удалось выполнить действие";
}

function formatSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} КБ`
    : `${(size / (1024 * 1024)).toFixed(1)} МБ`;
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

export function KnowledgePage() {
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
  const [sectionDialog, setSectionDialog] = useState<
    KnowledgeSection | "new" | null
  >(null);
  const [articleDialog, setArticleDialog] = useState<
    KnowledgeArticle | "new" | null
  >(null);
  const [importDialog, setImportDialog] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importSectionId, setImportSectionId] = useState<number | null>(null);
  const [importResult, setImportResult] =
    useState<KnowledgeImportResult | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyEditorRef = useRef<HTMLTextAreaElement>(null);
  const importFilesRef = useRef<HTMLInputElement>(null);
  const importFolderRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const requestedArticleRef = useRef<number | null>(null);
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
  const goToArticleList = () => {
    setArticle(null);
    requestedArticleRef.current = null;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("articleId");
        return next;
      },
      { replace: true },
    );
  };
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
    if (activeSectionId === null && sectionParam !== "all" && sections.length)
      setActiveSectionId(sections[0].id);
    if (
      activeSectionId !== null &&
      !sections.some((section) => section.id === activeSectionId)
    )
      setActiveSectionId(sections[0]?.id ?? null);
  }, [activeSectionId, sectionParam, sections, setActiveSectionId]);
  useEffect(() => {
    if (sectionsQuery.error) setError(errorText(sectionsQuery.error));
    if (articlesQuery.error) setError(errorText(articlesQuery.error));
  }, [sectionsQuery.error, articlesQuery.error]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setImageUrls({});
    if (!article) return;
    for (const attachment of article.attachments) {
      if (!attachment.mimeType.startsWith("image/")) continue;
      void downloadKnowledgeFile(
        `/knowledge/attachments/${attachment.id}/download`,
      )
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          if (cancelled) URL.revokeObjectURL(url);
          else {
            urls.push(url);
            setImageUrls((current) => ({ ...current, [attachment.id]: url }));
          }
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [article]);

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

  const openImport = () => {
    setImportFiles([]);
    setImportSectionId(activeSectionId ?? sections[0]?.id ?? null);
    setImportResult(null);
    setError("");
    setImportDialog(true);
  };
  const openArticle = useCallback(
    async (id: number) => {
      setError("");
      requestedArticleRef.current = id;
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
    if (articleIdFromUrl && requestedArticleRef.current !== articleIdFromUrl) {
      requestedArticleRef.current = articleIdFromUrl;
      void openArticle(articleIdFromUrl);
    } else if (!articleIdFromUrl) {
      requestedArticleRef.current = null;
      if (article) setArticle(null);
    }
  }, [article, articleIdFromUrl, openArticle]);

  const downloadAttachment = async (attachment: KnowledgeAttachment) => {
    setError("");
    try {
      const blob = await downloadKnowledgeFile(
        `/knowledge/attachments/${attachment.id}/download`,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(errorText(reason));
    }
  };

  const uploadAttachments = async (articleId: number, files: File[]) => {
    await uploadKnowledgeAttachments(articleId, files);
    await openArticle(articleId);
  };

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

  const saveArticle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const isNew = articleDialog === "new";
    const body = {
      sectionId: Number(form.get("sectionId")),
      title: String(form.get("title") ?? ""),
      body: String(form.get("body") ?? ""),
    };
    const files = pendingFiles;
    try {
      const saved = await knowledgeRequest<{ id: number; sectionId: number }>(
        isNew
          ? "/knowledge/articles"
          : `/knowledge/articles/${articleDialog!.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          body: JSON.stringify({
            ...body,
            body: body.body.replace(/\[\[image:pending:\d+\]\]/g, ""),
          }),
        },
      );
      let finalBody = body.body;
      if (files.length) {
        const upload = new FormData();
        files.forEach((file) => upload.append("files", file));
        const uploaded = await knowledgeRequest<KnowledgeAttachment[]>(
          `/knowledge/articles/${saved.id}/attachments`,
          {
            method: "POST",
            body: upload,
          },
        );
        files.forEach((file, index) => {
          if (file.type.startsWith("image/"))
            finalBody = finalBody.replaceAll(
              `[[image:pending:${index}]]`,
              `[[image:${uploaded[index].id}]]`,
            );
        });
        if (finalBody !== body.body.replace(/\[\[image:pending:\d+\]\]/g, ""))
          await knowledgeRequest(`/knowledge/articles/${saved.id}`, {
            method: "PATCH",
            body: JSON.stringify({ body: finalBody }),
          });
      }
      setArticleDialog(null);
      setActiveSectionId(saved.sectionId);
      await reloadSections(saved.sectionId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.knowledge.articles,
      });
      await openArticle(saved.id);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
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

  const deleteAttachment = async (attachment: KnowledgeAttachment) => {
    if (!article || !window.confirm(`Удалить файл «${attachment.fileName}»?`))
      return;
    try {
      await knowledgeRequest<void>(`/knowledge/attachments/${attachment.id}`, {
        method: "DELETE",
      });
      await openArticle(article.id);
    } catch (reason) {
      setError(errorText(reason));
    }
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
        {
          method: "POST",
          body: form,
        },
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

  return (
    <div className="knowledge-layout">
      <aside className="panel knowledge-sidebar">
        <div className="knowledge-sidebar-head">
          <h2>Разделы</h2>
          <button
            className="icon-button"
            title="Добавить раздел"
            aria-label="Добавить раздел"
            onClick={() => setSectionDialog("new")}
          >
            <FolderPlus size={17} />
          </button>
        </div>
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
      </aside>

      <section className="knowledge-content">
        {error && <div className="page-error">{error}</div>}
        {article ? (
          <KnowledgeArticleView
            article={article}
            imageUrls={imageUrls}
            setArticle={goToArticleList}
            setError={setError}
            editArticle={editArticle}
            deleteArticle={deleteArticle}
            downloadAttachment={downloadAttachment}
            deleteAttachment={deleteAttachment}
            uploadAttachments={uploadAttachments}
            formatSize={formatSize}
            errorText={errorText}
          />
        ) : (
          <KnowledgeArticleList
            search={search}
            setSearch={setSearch}
            onImport={openImport}
            currentSection={currentSection}
            editSection={setSectionDialog}
            deleteSection={(section) => void deleteSection(section)}
            editArticle={editArticle}
            activeSectionId={activeSectionId}
            articles={articles}
            openArticle={openArticle}
          />
        )}
      </section>

      <KnowledgeEditDialogs
        sectionDialog={sectionDialog}
        setSectionDialog={setSectionDialog}
        articleDialog={articleDialog}
        setArticleDialog={setArticleDialog}
        sections={sections}
        error={error}
        busy={busy}
        saveSection={saveSection}
        saveArticle={saveArticle}
        activeSectionId={activeSectionId}
        bodyEditorRef={bodyEditorRef}
        addArticleFiles={addArticleFiles}
        pendingFiles={pendingFiles}
        setPendingFiles={setPendingFiles}
        insertImageMarker={insertImageMarker}
        formatSize={formatSize}
      />

      {importDialog && (
        <KnowledgeImportDialog
          sections={sections}
          importSectionId={importSectionId}
          setImportSectionId={setImportSectionId}
          importFilesRef={importFilesRef}
          importFolderRef={importFolderRef}
          selectImportFiles={selectImportFiles}
          importFiles={importFiles}
          setImportFiles={setImportFiles}
          setImportResult={setImportResult}
          importResult={importResult}
          error={error}
          busy={busy}
          importKnowledgeFiles={importKnowledgeFiles}
          setImportDialog={setImportDialog}
        />
      )}
    </div>
  );
}
