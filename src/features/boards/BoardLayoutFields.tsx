import { RotateCcw } from "lucide-react";
import type { BoardDetails } from "../../types";
import { BoardLayoutPreview } from "./BoardLayoutPreview";

type BoardLayoutFieldsProps = {
  board: BoardDetails;
  scope: string;
  selectScope: (value: string) => void;
  widthText: string;
  setWidthText: (value: string) => void;
  width: number;
  min: number;
  max: number;
  setWidth: (value: number) => void;
  previewWidth: number;
  cardsPerRow: number;
  setCardsPerRow: (value: number) => void;
  selected: BoardDetails["columns"];
  busy: boolean;
  defaultWidth: number;
  minWidth: (count: number) => number;
};

export function BoardLayoutFields({
  board,
  scope,
  selectScope,
  widthText,
  setWidthText,
  width,
  min,
  max,
  setWidth,
  previewWidth,
  cardsPerRow,
  setCardsPerRow,
  selected,
  busy,
  defaultWidth,
  minWidth,
}: BoardLayoutFieldsProps) {
  const previewCards = selected[0]?.cards ?? [];
  return (
    <fieldset className="board-layout-fields" disabled={busy}>
      <label className="field">
        <span>Применить к</span>
        <select
          value={scope}
          onChange={(event) => selectScope(event.target.value)}
        >
          <option value="all">Все столбцы ({board.columns.length})</option>
          {board.columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.name}
            </option>
          ))}
        </select>
      </label>
      <div className="layout-control-heading">
        <label htmlFor="board-column-width">Ширина столбца</label>
        <div className="layout-width-input">
          <input
            id="board-column-width"
            type="number"
            min={min}
            max={max}
            step={1}
            required
            value={widthText}
            onChange={(event) => setWidthText(event.target.value)}
            onBlur={() => setWidth(width || min)}
          />
          <span>px</span>
        </div>
      </div>
      <input
        className="layout-width-slider"
        type="range"
        min={min}
        max={max}
        step={1}
        value={previewWidth}
        onChange={(event) => setWidth(Number(event.target.value))}
        aria-label="Ширина столбца ползунком"
      />
      <div className="layout-presets">
        {[1, 2, 3, 4].map((scale) => (
          <button
            type="button"
            key={scale}
            className={width === defaultWidth * scale ? "active" : ""}
            onClick={() => setWidth(defaultWidth * scale)}
          >
            {scale === 1 ? "Обычная" : `×${scale}`}
          </button>
        ))}
      </div>
      <div className="layout-control-heading">
        <span id="board-grid-label">Карточек в строке</span>
        <b>{cardsPerRow}</b>
      </div>
      <div
        className="layout-grid-options"
        role="group"
        aria-labelledby="board-grid-label"
      >
        {[1, 2, 3, 4, 5, 6].map((count) => (
          <button
            type="button"
            key={count}
            aria-pressed={cardsPerRow === count}
            className={cardsPerRow === count ? "active" : ""}
            onClick={() => {
              setCardsPerRow(count);
              setWidthText(
                String(Math.max(width || defaultWidth, minWidth(count))),
              );
            }}
          >
            {count}
          </button>
        ))}
      </div>
      <p className="board-dialog-hint">
        Ширина карточки: около{" "}
        {Math.floor((previewWidth - 24 - (cardsPerRow - 1) * 8) / cardsPerRow)}{" "}
        px. При увеличении сетки столбец расширится, чтобы текст оставался
        читаемым.
      </p>
      <BoardLayoutPreview
        previewWidth={previewWidth}
        cardsPerRow={cardsPerRow}
        scope={scope}
        selectedColumnName={selected[0]?.name}
        previewCards={previewCards}
      />
      <button
        type="button"
        className="button ghost compact layout-reset"
        onClick={() => {
          setWidthText(String(defaultWidth));
          setCardsPerRow(1);
        }}
      >
        <RotateCcw /> Стандартный вид
      </button>
    </fieldset>
  );
}
