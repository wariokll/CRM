import { BookOpen, FolderPlus } from "lucide-react";
import { useKnowledgePage } from "../hooks/useKnowledgePage";
import { ErrorState } from "../../../components/ui";
import { KnowledgeImportDialog } from "../components/KnowledgeImportDialog";
import { KnowledgeEditDialogs } from "../components/KnowledgeEditDialogs";
import { KnowledgeArticleView } from "../components/KnowledgeArticleView";
import { KnowledgeArticleList } from "../components/KnowledgeArticleList";

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

export function KnowledgePage() {
  const {
    activeSectionId,
    setActiveSectionId,
    goToArticleList,
    article,
    setArticle,
    search,
    setSearch,
    sectionDialog,
    setSectionDialog,
    articleDialog,
    setArticleDialog,
    importDialog,
    setImportDialog,
    importFiles,
    setImportFiles,
    importSectionId,
    setImportSectionId,
    importResult,
    setImportResult,
    pendingFiles,
    setPendingFiles,
    imageUrls,
    error,
    setError,
    busy,
    bodyEditorRef,
    importFilesRef,
    importFolderRef,
    sections,
    articles,
    openImport,
    openArticle,
    downloadAttachment,
    uploadAttachments,
    editArticle,
    insertImageMarker,
    addArticleFiles,
    saveSection,
    deleteSection,
    saveArticle,
    deleteArticle,
    deleteAttachment,
    selectImportFiles,
    importKnowledgeFiles,
    renderSection,
    currentSection,
  } = useKnowledgePage();

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
        {error && <ErrorState>{error}</ErrorState>}
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
