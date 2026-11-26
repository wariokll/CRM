import { Calendar, RotateCcw } from "lucide-react";
import type { ArchivedBoardCard, BoardColumn } from "../../types";

const dateFormat = new Intl.DateTimeFormat("ru-RU");

export function ArchivedCardItem({
  card,
  columns,
  targetColumnId,
  busy,
  loading,
  onTargetChange,
  onRestore,
}: {
  card: ArchivedBoardCard;
  columns: BoardColumn[];
  targetColumnId: number | undefined;
  busy: boolean;
  loading: boolean;
  onTargetChange: (columnId: number) => void;
  onRestore: () => void;
}) {
  return (
    <article className="archived-card">
      <div className="archived-card-heading">
        <b>{card.title}</b>
        <span>{card.column.name}</span>
      </div>
      <div className="archived-card-meta">
        <span>В архиве с {dateFormat.format(new Date(card.archivedAt))}</span>
        {card.deadline && (
          <span>
            <Calendar /> Срок:{" "}
            {dateFormat.format(
              new Date(card.deadline.slice(0, 10) + "T00:00:00"),
            )}
          </span>
        )}
      </div>
      {card.description && (
        <details>
          <summary>Описание</summary>
          <p>{card.description}</p>
        </details>
      )}
      <div className="archived-card-actions">
        <label className="field">
          <span>Восстановить в столбец</span>
          <select
            value={targetColumnId ?? ""}
            disabled={busy || loading}
            onChange={(event) => onTargetChange(Number(event.target.value))}
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button secondary compact"
          disabled={busy || loading || !targetColumnId}
          onClick={onRestore}
        >
          <RotateCcw />
          {busy ? "Восстановление…" : "Восстановить"}
        </button>
      </div>
    </article>
  );
}
