import {
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, apiFile } from "../../api";
import type {
  KnowledgeArticle,
  KnowledgeArticleSummary,
  KnowledgeAttachment,
  KnowledgeSection,
} from "../../types";

function errorText(reason: unknown) {
  return reason instanceof Error ? reason.message : "Не удалось выполнить действие";
}

function formatSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} КБ`
    : `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

export function KnowledgePage() {
  const [sections, setSections] = useState<KnowledgeSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [articles, setArticles] = useState<KnowledgeArticleSummary[]>([]);
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [search, setSearch] = useState("");
  const [sectionDialog, setSectionDialog] = useState<KnowledgeSection | "new" | null>(null);
  const [articleDialog, setArticleDialog] = useState<KnowledgeArticle | "new" | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [refreshList, setRefreshList] = useState(0);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void api<KnowledgeSection[]>("/knowledge/sections")
      .then((items) => {
        setSections(items);
        if (items.length) setActiveSectionId(items[0].id);
      })
      .catch((reason) => setError(errorText(reason)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    else if (activeSectionId) query.set("sectionId", String(activeSectionId));
    const suffix = query.size ? `?${query.toString()}` : "";
    void api<KnowledgeArticleSummary[]>(`/knowledge/articles${suffix}`)
      .then((items) => {
        if (!cancelled) setArticles(items);
      })
      .catch((reason) => {
        if (!cancelled) setError(errorText(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [activeSectionId, search, refreshList]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setImageUrls({});
    if (!article) return;
    for (const attachment of article.attachments) {
      if (!attachment.mimeType.startsWith("image/")) continue;
      void apiFile(`/knowledge/attachments/${attachment.id}/download`)
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
    const items = await api<KnowledgeSection[]>("/knowledge/sections");
    setSections(items);
    if (selectId !== undefined) setActiveSectionId(selectId);
    else if (activeSectionId && !items.some((item) => item.id === activeSectionId))
      setActiveSectionId(items[0]?.id ?? null);
  };

  const openArticle = async (id: number) => {
    setError("");
    try {
      setArticle(await api<KnowledgeArticle>(`/knowledge/articles/${id}`));
    } catch (reason) {
      setError(errorText(reason));
    }
  };

  const downloadAttachment = async (attachment: KnowledgeAttachment) => {
    setError("");
    try {
      const blob = await apiFile(`/knowledge/attachments/${attachment.id}/download`);
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
      const saved = await api<KnowledgeSection>(
        isNew ? "/knowledge/sections" : `/knowledge/sections/${sectionDialog!.id}`,
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
      await api<void>(`/knowledge/sections/${section.id}`, { method: "DELETE" });
      await reloadSections(activeSectionId === section.id ? null : activeSectionId);
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
      const saved = await api<{ id: number; sectionId: number }>(
        isNew ? "/knowledge/articles" : `/knowledge/articles/${articleDialog!.id}`,
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
        const uploaded = await api<KnowledgeAttachment[]>(`/knowledge/articles/${saved.id}/attachments`, {
          method: "POST",
          body: upload,
        });
        files.forEach((file, index) => {
          if (file.type.startsWith("image/"))
            finalBody = finalBody.replaceAll(
              `[[image:pending:${index}]]`,
              `[[image:${uploaded[index].id}]]`,
            );
        });
        if (finalBody !== body.body.replace(/\[\[image:pending:\d+\]\]/g, ""))
          await api(`/knowledge/articles/${saved.id}`, {
            method: "PATCH",
            body: JSON.stringify({ body: finalBody }),
          });
      }
      setArticleDialog(null);
      setActiveSectionId(saved.sectionId);
      setRefreshList((value) => value + 1);
      await openArticle(saved.id);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  const deleteArticle = async (item: KnowledgeArticle) => {
    if (!window.confirm(`Удалить статью «${item.title}» и её вложения?`)) return;
    try {
      await api<void>(`/knowledge/articles/${item.id}`, { method: "DELETE" });
      setArticle(null);
      setRefreshList((value) => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    }
  };

  const deleteAttachment = async (attachment: KnowledgeAttachment) => {
    if (!article || !window.confirm(`Удалить файл «${attachment.fileName}»?`)) return;
    try {
      await api<void>(`/knowledge/attachments/${attachment.id}`, { method: "DELETE" });
      await openArticle(article.id);
    } catch (reason) {
      setError(errorText(reason));
    }
  };

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
        <small>{section._count.articles}</small>
      </button>
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
            <small>{sections.reduce((sum, item) => sum + item._count.articles, 0)}</small>
          </button>
          {sections.filter((item) => item.parentId === null).map((item) => renderSection(item))}
        </div>
      </aside>

      <section className="knowledge-content">
        {error && <div className="page-error">{error}</div>}
        {article ? (
          <article className="panel table-panel">
            <div className="knowledge-article-head">
              <div>
                <button className="link-button" onClick={() => setArticle(null)}>
                  <ArrowLeft size={15} /> К списку
                </button>
                <h2>{article.title}</h2>
                <small>{article.section.name} · обновлено {new Date(article.updatedAt).toLocaleDateString("ru-RU")}</small>
              </div>
              <div className="knowledge-article-actions">
                <button
                  className="button secondary"
                  onClick={() => editArticle(article)}
                >
                  <Pencil size={15} /> Изменить
                </button>
                <button
                  className="button danger"
                  onClick={() => void deleteArticle(article)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="knowledge-article-body">
              {article.body
                ? article.body.split(/(\[\[image:\d+\]\])/g).map((part, index) => {
                    const match = /^\[\[image:(\d+)\]\]$/.exec(part);
                    if (!match) return <span key={index}>{part}</span>;
                    const imageId = Number(match[1]);
                    const attachment = article.attachments.find((item) => item.id === imageId);
                    return imageUrls[imageId] ? (
                      <img key={index} src={imageUrls[imageId]} alt={attachment?.fileName ?? "Иллюстрация"} />
                    ) : (
                      <span key={index} className="knowledge-image-pending">Загрузка изображения…</span>
                    );
                  })
                : "В статье пока нет текста."}
            </div>
            <div className="knowledge-files">
              <div className="knowledge-sidebar-head">
                <h3>Вложения</h3>
                <label className="button secondary">
                  <Upload size={15} /> Добавить файлы
                  <input
                    type="file"
                    hidden
                    multiple
                    accept=".txt,.doc,.docx,.rtf,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                    onChange={async (event) => {
                      const selected = Array.from(event.currentTarget.files ?? []);
                      if (!selected.length) return;
                      setError("");
                      const data = new FormData();
                      selected.forEach((file) => data.append("files", file));
                      try {
                        await api(`/knowledge/articles/${article.id}/attachments`, {
                          method: "POST",
                          body: data,
                        });
                        await openArticle(article.id);
                      } catch (reason) {
                        setError(errorText(reason));
                      } finally {
                        event.currentTarget.value = "";
                      }
                    }}
                  />
                </label>
              </div>
              {article.attachments
                .filter((attachment) => !article.body.includes(`[[image:${attachment.id}]]`))
                .map((attachment) => (
                <div className="knowledge-file" key={attachment.id}>
                  {imageUrls[attachment.id] ? (
                    <img src={imageUrls[attachment.id]} alt={attachment.fileName} />
                  ) : attachment.mimeType.startsWith("image/") ? (
                    <ImageIcon size={18} />
                  ) : (
                    <FileText size={18} />
                  )}
                  <span>{attachment.fileName} · {formatSize(attachment.size)}</span>
                  <button
                    title="Скачать файл"
                    aria-label={`Скачать ${attachment.fileName}`}
                    onClick={() => void downloadAttachment(attachment)}
                  >
                    <Download />
                  </button>
                  <button
                    title="Удалить файл"
                    aria-label={`Удалить ${attachment.fileName}`}
                    onClick={() => void deleteAttachment(attachment)}
                  >
                    <X />
                  </button>
                </div>
              ))}
              {!article.attachments.length && <small>В статье пока нет вложений.</small>}
            </div>
          </article>
        ) : (
          <section className="panel table-panel">
            <div className="knowledge-toolbar">
              <div className="knowledge-search">
                <Search />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Поиск по статьям"
                  aria-label="Поиск по статьям"
                />
              </div>
              <div className="inline-actions">
                {currentSection && (
                  <>
                    <button
                      className="button secondary"
                      onClick={() => setSectionDialog(currentSection)}
                    >
                      <Pencil size={15} /> Раздел
                    </button>
                    <button
                      className="button ghost"
                      title="Удалить пустой раздел"
                      aria-label="Удалить раздел"
                      disabled={currentSection._count.children > 0 || currentSection._count.articles > 0}
                      onClick={() => void deleteSection(currentSection)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
                <button
                  className="button primary"
                  disabled={!activeSectionId}
                  onClick={() => editArticle("new")}
                >
                  <Plus size={15} /> Статья
                </button>
              </div>
            </div>
            {search && <p className="request-filter-summary">Результаты поиска по всем статьям</p>}
            {articles.length ? (
              <div className="knowledge-article-list">
                {articles.map((item) => (
                  <button
                    className="knowledge-article-row"
                    key={item.id}
                    onClick={() => void openArticle(item.id)}
                  >
                    <FileText size={17} />
                    <div>
                      <b>{item.title}</b>
                      {search && <small className="knowledge-article-section">{item.section.name}</small>}
                      {item.excerpt && <small className="knowledge-excerpt">{item.excerpt}</small>}
                    </div>
                    <small className="knowledge-date">{new Date(item.updatedAt).toLocaleDateString("ru-RU")}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty">
                <BookOpen />
                <b>{search ? "Ничего не найдено" : "В этом разделе пока нет статей"}</b>
                <span>{search ? "Попробуйте изменить запрос." : "Создайте статью или выберите другой раздел."}</span>
              </div>
            )}
          </section>
        )}
      </section>

      {sectionDialog && (
        <div className="modal-backdrop" onMouseDown={() => setSectionDialog(null)}>
          <section className="modal knowledge-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">БАЗА ЗНАНИЙ</span>
                <h2>{sectionDialog === "new" ? "Новый раздел" : "Изменить раздел"}</h2>
              </div>
              <button className="icon-button" onClick={() => setSectionDialog(null)} aria-label="Закрыть"><X /></button>
            </div>
            <form onSubmit={saveSection}>
              <label className="field">
                <span>Название раздела</span>
                <input name="name" required minLength={2} maxLength={160} defaultValue={sectionDialog === "new" ? "" : sectionDialog.name} />
              </label>
              <label className="field">
                <span>Родительский раздел</span>
                <select name="parentId" defaultValue={sectionDialog === "new" ? "" : sectionDialog.parentId ?? ""}>
                  <option value="">Верхний уровень</option>
                  {sections.filter((item) => item.id !== (sectionDialog === "new" ? null : sectionDialog.id)).map((item) => (
                    <option value={item.id} key={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              {error && <div className="knowledge-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setSectionDialog(null)}>Отмена</button>
                <button className="button primary" disabled={busy}>Сохранить</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {articleDialog && (
        <div className="modal-backdrop" onMouseDown={() => setArticleDialog(null)}>
          <section className="modal knowledge-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">БАЗА ЗНАНИЙ</span>
                <h2>{articleDialog === "new" ? "Новая статья" : "Изменить статью"}</h2>
              </div>
              <button className="icon-button" onClick={() => setArticleDialog(null)} aria-label="Закрыть"><X /></button>
            </div>
            <form onSubmit={saveArticle}>
              <label className="field">
                <span>Раздел</span>
                <select name="sectionId" required defaultValue={articleDialog === "new" ? activeSectionId ?? "" : articleDialog.sectionId}>
                  {sections.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Название статьи</span>
                <input name="title" required minLength={2} maxLength={240} defaultValue={articleDialog === "new" ? "" : articleDialog.title} />
              </label>
              <label className="field">
                <span>Текст</span>
                <textarea ref={bodyEditorRef} name="body" rows={10} defaultValue={articleDialog === "new" ? "" : articleDialog.body} />
              </label>
              <label className="field">
                <span>Документы и изображения</span>
                <input
                  type="file"
                  multiple
                  accept=".txt,.doc,.docx,.rtf,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                  onChange={(event) => {
                    addArticleFiles(Array.from(event.currentTarget.files ?? []));
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {pendingFiles.map((file, index) => (
                <div className="knowledge-pending-file" key={`${file.name}-${index}`}>
                  {file.type.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}
                  <span>{file.name} · {formatSize(file.size)}</span>
                  {file.type.startsWith("image/") && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => insertImageMarker(`[[image:pending:${index}]]`)}
                    >
                      Вставить в текст
                    </button>
                  )}
                  <button
                    type="button"
                    className="button ghost"
                    aria-label={`Убрать ${file.name}`}
                    onClick={() => setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              {articleDialog !== "new" && articleDialog.attachments
                .filter((attachment) => attachment.mimeType.startsWith("image/"))
                .map((attachment) => (
                  <div className="knowledge-pending-file" key={`existing-${attachment.id}`}>
                    <ImageIcon size={16} />
                    <span>{attachment.fileName}</span>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => insertImageMarker(`[[image:${attachment.id}]]`)}
                    >
                      Вставить в текст
                    </button>
                  </div>
                ))}
              {error && <div className="knowledge-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setArticleDialog(null)}>Отмена</button>
                <button className="button primary" disabled={busy || !sections.length}>{busy ? "Сохранение…" : "Сохранить"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
