import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Calendar,
  RotateCcw,
  Search,
} from "lucide-react";
import { api, ApiError } from "../../api";
import type { ArchivedBoardCard, BoardDetails } from "../../types";
import { Dialog, errorText } from "./BoardDialog";

const dateFormat = new Intl.DateTimeFormat("ru-RU");

export function BoardArchiveDialog({
  board,
  refreshKey,
  close,
  updated,
  refresh,
}: {
  board: BoardDetails;
  refreshKey: number;
  close: () => void;
  updated: (board: BoardDetails) => void;
  refresh: () => Promise<void>;
}) {
  const [cards, setCards] = useState<ArchivedBoardCard[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [targets, setTargets] = useState<Record<number, number>>({});
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api<ArchivedBoardCard[]>(`/boards/${board.id}/archive`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setCards(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(errorText(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [board.id, refreshKey, reload]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru-RU");
    return cards.filter((card) =>
      `${card.title} ${card.description ?? ""} ${card.column.name}`
        .toLocaleLowerCase("ru-RU")
        .includes(query),
    );
  }, [cards, search]);
  const targetFor = (card: ArchivedBoardCard) => {
    const requested = targets[card.id] ?? card.columnId;
    return board.columns.some((column) => column.id === requested)
      ? requested
      : board.columns[0]?.id;
  };
  const restore = async (card: ArchivedBoardCard) => {
    const targetColumnId = targetFor(card);
    if (!targetColumnId || busyId !== null || loading) return;
    setBusyId(card.id);
    setError("");
    setNotice("");
    try {
      const result = await api<BoardDetails>(
        `/boards/cards/${card.id}/restore`,
        {
          method: "POST",
          body: JSON.stringify({ version: card.version, targetColumnId }),
        },
      );
      setCards((current) => current.filter((item) => item.id !== card.id));
      updated(result);
      setReload((value) => value + 1);
      setNotice(
        `«${card.title}» восстановлена в столбец «${result.columns.find((column) => column.id === targetColumnId)?.name ?? ""}»`,
      );
    } catch (reason) {
      setError(errorText(reason));
      if (reason instanceof ApiError && [404, 409].includes(reason.status)) {
        setReload((value) => value + 1);
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog title={`Архив · ${board.name}`} close={close} wide>
      <p className="board-dialog-hint">
        Восстановите карточку в исходный или другой столбец этой доски. Она
        появится в конце списка.
      </p>
      <label className="board-access-search">
        <Search />
        <input
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по названию, описанию или столбцу"
          aria-label="Поиск в архиве"
        />
      </label>
      {error && (
        <div className="form-error" role="alert">
          <AlertTriangle />
          {error}
        </div>
      )}
      {notice && (
        <p className="archive-success" role="status">
          {notice}
        </p>
      )}
      {loading && (
        <div className="loading-line" role="status">
          Загрузка архива…
        </div>
      )}
      <div className="board-archive-list" aria-busy={loading}>
        {visible.map((card) => (
          <article className="archived-card" key={card.id}>
            <div className="archived-card-heading">
              <b>{card.title}</b>
              <span>{card.column.name}</span>
            </div>
            <div className="archived-card-meta">
              <span>
                В архиве с {dateFormat.format(new Date(card.archivedAt))}
              </span>
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
                  value={targetFor(card) ?? ""}
                  disabled={busyId !== null || loading}
                  onChange={(event) =>
                    setTargets((current) => ({
                      ...current,
                      [card.id]: Number(event.target.value),
                    }))
                  }
                >
                  {board.columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button secondary compact"
                disabled={busyId !== null || loading || !targetFor(card)}
                onClick={() => void restore(card)}
              >
                <RotateCcw />
                {busyId === card.id ? "Восстановление…" : "Восстановить"}
              </button>
            </div>
          </article>
        ))}
        {!loading && !visible.length && !error && (
          <div className="archive-empty">
            <Archive />
            <b>{cards.length ? "Ничего не найдено" : "Архив пуст"}</b>
            <p>
              {cards.length
                ? "Попробуйте изменить поисковый запрос."
                : "Здесь появятся карточки, отправленные в архив."}
            </p>
          </div>
        )}
      </div>
      {error && (
        <button
          className="button secondary compact"
          onClick={() => {
            setError("");
            setReload((value) => value + 1);
          }}
        >
          Обновить архив
        </button>
      )}
      <div className="modal-actions">
        <button className="button secondary" onClick={close}>
          Закрыть
        </button>
      </div>
    </Dialog>
  );
}
