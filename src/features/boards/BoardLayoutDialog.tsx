import { useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { ApiError } from "../../api";
import type { BoardDetails } from "../../types";
import { Dialog, errorText } from "./BoardDialog";
import { BoardLayoutFields } from "./BoardLayoutFields";

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
  saveLayout,
}: {
  board: BoardDetails;
  initialColumnId: number | null;
  close: () => void;
  updated: (board: BoardDetails) => void;
  refresh: () => Promise<void>;
  saveLayout: (
    boardId: number,
    columns: {
      id: number;
      version: number;
      width: number;
      cardsPerRow: number;
    }[],
  ) => Promise<BoardDetails>;
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
      const result = await saveLayout(
        board.id,
        selected.map((column) => ({
          id: column.id,
          version: versions.get(column.id) ?? column.version,
          width,
          cardsPerRow,
        })),
      );
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
  return (
    <Dialog title="Вид доски" close={close} wide>
      <form onSubmit={submit}>
        <p className="board-dialog-hint">
          Настройте столбцы под свой рабочий процесс. Изменения сохраняются для
          всех участников доски.
        </p>
        <BoardLayoutFields
          board={board}
          scope={scope}
          selectScope={selectScope}
          widthText={widthText}
          setWidthText={setWidthText}
          width={width}
          min={min}
          max={MAX_WIDTH}
          setWidth={setWidth}
          previewWidth={previewWidth}
          cardsPerRow={cardsPerRow}
          setCardsPerRow={setCardsPerRow}
          selected={selected}
          busy={busy}
          defaultWidth={DEFAULT_WIDTH}
          minWidth={minimumWidth}
        />
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
