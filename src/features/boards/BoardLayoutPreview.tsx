import type { BoardCard } from "../../types";

export function BoardLayoutPreview({
  previewWidth,
  cardsPerRow,
  scope,
  selectedColumnName,
  previewCards,
}: {
  previewWidth: number;
  cardsPerRow: number;
  scope: string;
  selectedColumnName?: string;
  previewCards: BoardCard[];
}) {
  return (
    <>
      <div className="layout-preview-label">
        Предпросмотр · {previewWidth} px
      </div>
      <div className="layout-preview-viewport">
        <div className="layout-preview-column" style={{ width: previewWidth }}>
          <b>{scope === "all" ? "Пример столбца" : selectedColumnName}</b>
          <div
            className="layout-preview-grid"
            style={{
              gridTemplateColumns: `repeat(${cardsPerRow}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: cardsPerRow * 2 }, (_, index) => (
              <div key={index}>
                {previewCards[index]?.title ?? `Карточка ${index + 1}`}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
