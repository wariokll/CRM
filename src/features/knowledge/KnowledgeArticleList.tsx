import {
  BookOpen,
  FileText,
  FileUp,
  Plus,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";
import type {
  KnowledgeArticle,
  KnowledgeArticleSummary,
  KnowledgeSection,
} from "../../types";

export function KnowledgeArticleList({
  search,
  setSearch,
  onImport,
  currentSection,
  editSection,
  deleteSection,
  editArticle,
  activeSectionId,
  articles,
  openArticle,
}: {
  search: string;
  setSearch: (search: string) => void;
  onImport: () => void;
  currentSection: KnowledgeSection | undefined;
  editSection: (section: KnowledgeSection) => void;
  deleteSection: (section: KnowledgeSection) => void;
  editArticle: (article: KnowledgeArticle | "new") => void;
  activeSectionId: number | null;
  articles: KnowledgeArticleSummary[];
  openArticle: (id: number) => Promise<void>;
}) {
  return (
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
          <button
            className="button secondary"
            onClick={() => {
              onImport();
            }}
          >
            <FileUp size={15} /> Импорт
          </button>
          {currentSection && (
            <>
              <button
                className="button secondary"
                onClick={() => editSection(currentSection)}
              >
                <Pencil size={15} /> Раздел
              </button>
              <button
                className="button ghost"
                title="Удалить пустой раздел"
                aria-label="Удалить раздел"
                disabled={
                  currentSection._count.children > 0 ||
                  currentSection._count.articles > 0
                }
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
      {search && (
        <p className="request-filter-summary">
          Результаты поиска по всем статьям
        </p>
      )}
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
                {search && (
                  <small className="knowledge-article-section">
                    {item.section.name}
                  </small>
                )}
                {item.excerpt && (
                  <small className="knowledge-excerpt">{item.excerpt}</small>
                )}
              </div>
              <small className="knowledge-date">
                {new Date(item.updatedAt).toLocaleDateString("ru-RU")}
              </small>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          <BookOpen />
          <b>
            {search ? "Ничего не найдено" : "В этом разделе пока нет статей"}
          </b>
          <span>
            {search
              ? "Попробуйте изменить запрос."
              : "Создайте статью или выберите другой раздел."}
          </span>
        </div>
      )}
    </section>
  );
}
