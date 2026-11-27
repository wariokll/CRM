import { X } from "lucide-react";
import type { KnowledgeEditDialogProps } from "../types/knowledge-edit";

export function KnowledgeSectionDialog({
  sectionDialog,
  setSectionDialog,
  sections,
  error,
  busy,
  saveSection,
}: KnowledgeEditDialogProps) {
  return (
    <>
      {sectionDialog && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSectionDialog(null)}
        >
          <section
            className="modal knowledge-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">БАЗА ЗНАНИЙ</span>
                <h2>
                  {sectionDialog === "new" ? "Новый раздел" : "Изменить раздел"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSectionDialog(null)}
                aria-label="Закрыть"
              >
                <X />
              </button>
            </div>
            <form onSubmit={saveSection}>
              <label className="field">
                <span>Название раздела</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={160}
                  defaultValue={
                    sectionDialog === "new" ? "" : sectionDialog.name
                  }
                />
              </label>
              <label className="field">
                <span>Родительский раздел</span>
                <select
                  name="parentId"
                  defaultValue={
                    sectionDialog === "new"
                      ? ""
                      : (sectionDialog.parentId ?? "")
                  }
                >
                  <option value="">Верхний уровень</option>
                  {sections
                    .filter(
                      (item) =>
                        item.id !==
                        (sectionDialog === "new" ? null : sectionDialog.id),
                    )
                    .map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              {error && <div className="knowledge-error">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSectionDialog(null)}
                >
                  Отмена
                </button>
                <button className="button primary" disabled={busy}>
                  Сохранить
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
