import { useState, type FormEvent } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { api, ApiError } from "../../api";
import type { BoardDetails } from "../../types";
import { Dialog, errorText } from "./BoardDialog";

const DEFAULT_WIDTH = 294;
const MAX_WIDTH = 1800;
const minimumWidth = (count: number) =>
  Math.max(240, 24 + count * 160 + (count - 1) * 8);

export function BoardLayoutDialog({
  board,
  initialColumnId,
  close,
  updated,
  refresh,
}: {
  board: BoardDetails;
  initialColumnId: number | null;
  close: () => void;
  updated: (board: BoardDetails) => void;
  refresh: () => Promise<void>;
}) {
  const initial =
    board.columns.find((column) => column.id === initialColumnId) ??
    board.columns[0];
  const [scope, setScope] = useState(
    initialColumnId === null ? "all" : String(initialColumnId),
  );
  const [widthText, setWidthText] = useState(
    String(initial?.width ?? DEFAULT_WIDTH),
  );
  const [cardsPerRow, setCardsPerRow] = useState(initial?.cardsPerRow ?? 1);
  const [versions, setVersions] = useState(
    () => new Map(board.columns.map((column) => [column.id, column.version])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const width = Number(widthText);
  const min = minimumWidth(cardsPerRow);
  const valid =
    widthText !== "" &&
    Number.isInteger(width) &&
    width >= min &&
    width <= MAX_WIDTH;
  const previewWidth = Math.max(min, Math.min(MAX_WIDTH, width || min));
  const selected =
    scope === "all"
      ? board.columns
      : board.columns.filter((column) => String(column.id) === scope);
  const setWidth = (value: number) =>
    setWidthText(String(Math.max(min, Math.min(MAX_WIDTH, Math.round(value)))));
  const selectScope = (value: string) => {
    setScope(value);
    const column =
      board.columns.find((item) => String(item.id) === value) ??
      board.columns[0];
    if (column) {
      setWidthText(String(column.width));
      setCardsPerRow(column.cardsPerRow);
    }
    setError("");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || !selected.length) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<BoardDetails>(`/boards/${board.id}/layout`, {
        method: "PATCH",
        body: JSON.stringify({
          columns: selected.map((column) => ({
            id: column.id,
            version: versions.get(column.id) ?? column.version,
            width,
            cardsPerRow,
          })),
        }),
      });
      updated(result);
      close();
    } catch (reason) {
      setError(errorText(reason));
      if (reason instanceof ApiError && [404, 409].includes(reason.status))
        await refresh();
    } finally {
      setBusy(false);
    }
  };
  const reloadSettings = () => {
    setVersions(
      new Map(board.columns.map((column) => [column.id, column.version])),
    );
    selectScope(selected.length ? scope : "all");
  };
  const previewCards = selected[0]?.cards ?? [];

  return (
    <Dialog title="Вид доски" close={close} wide>
      <form onSubmit={submit}>
        <p className="board-dialog-hint">
          Настройте столбцы под свой рабочий процесс. Изменения сохраняются для
          всех участников доски.
        </p>
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
                max={MAX_WIDTH}
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
            max={MAX_WIDTH}
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
                className={width === DEFAULT_WIDTH * scale ? "active" : ""}
                onClick={() => setWidth(DEFAULT_WIDTH * scale)}
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
                    String(
                      Math.max(width || DEFAULT_WIDTH, minimumWidth(count)),
                    ),
                  );
                }}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="board-dialog-hint">
            Ширина карточки: около{" "}
            {Math.floor(
              (previewWidth - 24 - (cardsPerRow - 1) * 8) / cardsPerRow,
            )}{" "}
            px. При увеличении сетки столбец расширится, чтобы текст оставался
            читаемым.
          </p>
          <div className="layout-preview-label">
            Предпросмотр · {previewWidth} px
          </div>
          <div className="layout-preview-viewport">
            <div
              className="layout-preview-column"
              style={{ width: previewWidth }}
            >
              <b>{scope === "all" ? "Пример столбца" : selected[0]?.name}</b>
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
          <button
            type="button"
            className="button ghost compact layout-reset"
            onClick={() => {
              setWidthText(String(DEFAULT_WIDTH));
              setCardsPerRow(1);
            }}
          >
            <RotateCcw /> Стандартный вид
          </button>
        </fieldset>
        {error && (
          <div className="form-error" role="alert">
            <AlertTriangle />
            {error}
            <button
              type="button"
              className="button secondary compact"
              onClick={reloadSettings}
            >
              Загрузить актуальные настройки
            </button>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={close}>
            Отмена
          </button>
          <button
            className="button"
            disabled={busy || !valid || !selected.length}
          >
            {busy ? "Сохранение…" : "Применить"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
