import { Image as ImageIcon, FileText, X } from "lucide-react";
import type { KnowledgeEditDialogProps } from "./knowledgeEdit.types";

export function KnowledgeArticleDialog({
  articleDialog,
  setArticleDialog,
  sections,
  error,
  busy,
  saveArticle,
  activeSectionId,
  bodyEditorRef,
  addArticleFiles,
  pendingFiles,
  setPendingFiles,
  insertImageMarker,
  formatSize,
}: KnowledgeEditDialogProps) {
  return (
    <>
      {articleDialog && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setArticleDialog(null)}
        >
          <section
            className="modal knowledge-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">БАЗА ЗНАНИЙ</span>
                <h2>
                  {articleDialog === "new" ? "Новая статья" : "Изменить статью"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setArticleDialog(null)}
                aria-label="Закрыть"
              >
                <X />
              </button>
            </div>
            <form onSubmit={saveArticle}>
              <label className="field">
                <span>Раздел</span>
                <select
                  name="sectionId"
                  required
                  defaultValue={
                    articleDialog === "new"
                      ? (activeSectionId ?? "")
                      : articleDialog.sectionId
                  }
                >
                  {sections.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Название статьи</span>
                <input
                  name="title"
                  required
                  minLength={2}
                  maxLength={240}
                  defaultValue={
                    articleDialog === "new" ? "" : articleDialog.title
                  }
                />
              </label>
              <label className="field">
                <span>Текст</span>
                <textarea
                  ref={bodyEditorRef}
                  name="body"
                  rows={10}
                  defaultValue={
                    articleDialog === "new" ? "" : articleDialog.body
                  }
                />
              </label>
              <label className="field">
                <span>Документы и изображения</span>
                <input
                  type="file"
                  multiple
                  accept=".txt,.doc,.docx,.rtf,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                  onChange={(event) => {
                    addArticleFiles(
                      Array.from(event.currentTarget.files ?? []),
                    );
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {pendingFiles.map((file, index) => (
                <div
                  className="knowledge-pending-file"
                  key={`${file.name}-${index}`}
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                  <span>
                    {file.name} · {formatSize(file.size)}
                  </span>
                  {file.type.startsWith("image/") && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        insertImageMarker(`[[image:pending:${index}]]`)
                      }
                    >
                      Вставить в текст
                    </button>
                  )}
                  <button
                    type="button"
                    className="button ghost"
                    aria-label={`Убрать ${file.name}`}
                    onClick={() =>
                      setPendingFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              {articleDialog !== "new" &&
                articleDialog.attachments
                  .filter((attachment) =>
                    attachment.mimeType.startsWith("image/"),
                  )
                  .map((attachment) => (
                    <div
                      className="knowledge-pending-file"
                      key={`existing-${attachment.id}`}
                    >
                      <ImageIcon size={16} />
                      <span>{attachment.fileName}</span>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          insertImageMarker(`[[image:${attachment.id}]]`)
                        }
                      >
                        Вставить в текст
                      </button>
                    </div>
                  ))}
              {error && <div className="knowledge-error">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setArticleDialog(null)}
                >
                  Отмена
                </button>
                <button
                  className="button primary"
                  disabled={busy || !sections.length}
                >
                  {busy ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
