import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { FileUp, FolderOpen, X } from "lucide-react";
import type { KnowledgeSection } from "../../types";

export type KnowledgeImportResult = {
  imported: number;
  skipped: number;
  failed: { fileName: string; reason: string }[];
};

export function KnowledgeImportDialog({
  sections,
  importSectionId,
  setImportSectionId,
  importFilesRef,
  importFolderRef,
  selectImportFiles,
  importFiles,
  setImportFiles,
  setImportResult,
  importResult,
  error,
  busy,
  importKnowledgeFiles,
  setImportDialog,
}: {
  sections: KnowledgeSection[];
  importSectionId: number | null;
  setImportSectionId: Dispatch<SetStateAction<number | null>>;
  importFilesRef: RefObject<HTMLInputElement | null>;
  importFolderRef: RefObject<HTMLInputElement | null>;
  selectImportFiles: (files: File[]) => void;
  importFiles: File[];
  setImportFiles: Dispatch<SetStateAction<File[]>>;
  setImportResult: Dispatch<SetStateAction<KnowledgeImportResult | null>>;
  importResult: KnowledgeImportResult | null;
  error: string;
  busy: boolean;
  importKnowledgeFiles: (event: FormEvent<HTMLFormElement>) => void;
  setImportDialog: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={() => setImportDialog(false)}>
      <section
        className="modal knowledge-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">БАЗА ЗНАНИЙ</span>
            <h2>Импорт статей</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => setImportDialog(false)}
            aria-label="Закрыть"
          >
            <X />
          </button>
        </div>
        <form onSubmit={importKnowledgeFiles}>
          <label className="field">
            <span>Раздел</span>
            <select
              required
              value={importSectionId ?? ""}
              onChange={(event) =>
                setImportSectionId(Number(event.target.value) || null)
              }
            >
              <option value="">Выберите раздел</option>
              {sections.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={importFilesRef}
            type="file"
            hidden
            multiple
            accept=".txt,.docx"
            onChange={(event) => {
              selectImportFiles(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={importFolderRef}
            type="file"
            hidden
            multiple
            accept=".txt,.docx"
            onChange={(event) => {
              selectImportFiles(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          <div className="knowledge-import-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => importFilesRef.current?.click()}
            >
              <FileUp size={15} /> Выбрать файлы
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                importFolderRef.current?.setAttribute("webkitdirectory", "");
                importFolderRef.current?.click();
              }}
            >
              <FolderOpen size={15} /> Выбрать папку
            </button>
          </div>
          {importFiles.length > 0 && (
            <div className="knowledge-import-files">
              <div className="knowledge-sidebar-head">
                <b>Выбрано: {importFiles.length}</b>
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => {
                    setImportFiles([]);
                    setImportResult(null);
                  }}
                >
                  Очистить
                </button>
              </div>
              {importFiles.slice(0, 5).map((file, index) => (
                <small
                  key={`${(file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name}-${index}`}
                >
                  {(file as File & { webkitRelativePath?: string })
                    .webkitRelativePath || file.name}
                </small>
              ))}
              {importFiles.length > 5 && (
                <small>И ещё {importFiles.length - 5}</small>
              )}
            </div>
          )}
          {importResult && (
            <div className="knowledge-import-result">
              <b>
                Добавлено: {importResult.imported} · пропущено:{" "}
                {importResult.skipped} · ошибок: {importResult.failed.length}
              </b>
              {importResult.failed.map((item, index) => (
                <small key={`${item.fileName}-${index}`}>
                  {item.fileName}: {item.reason}
                </small>
              ))}
            </div>
          )}
          {error && <div className="knowledge-error">{error}</div>}
          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setImportDialog(false)}
            >
              Закрыть
            </button>
            <button
              className="button primary"
              disabled={busy || !importFiles.length || !importSectionId}
            >
              {busy ? "Импорт…" : "Импортировать"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
