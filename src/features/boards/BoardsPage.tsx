import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  Archive,
  Calendar,
  GripVertical,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, ApiError } from "../../api";
import type {
  BoardAccessUser,
  BoardCard,
  BoardColumn,
  BoardDetails,
  BoardSummary,
  BoardType,
  User,
} from "../../types";

type DialogProps = {
  title: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
};

function Dialog({ title, close, children, wide }: DialogProps) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className={`modal ${wide ? "wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">КАНБАН-ДОСКА</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Закрыть">
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function errorText(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Не удалось выполнить действие";
}

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function SortableCard({ card, open }: { card: BoardCard; open: () => void }) {
  const sortable = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", cardId: card.id, columnId: card.columnId },
  });
  const wasDragged = useRef(false);
  useEffect(() => {
    if (sortable.isDragging) wasDragged.current = true;
  }, [sortable.isDragging]);
  const overdue = Boolean(
    card.deadline && card.deadline.slice(0, 10) < localToday(),
  );
  return (
    <article
      ref={sortable.setNodeRef}
      style={{
        transform: sortable.isDragging
          ? undefined
          : CSS.Transform.toString(sortable.transform),
        transition: sortable.isDragging ? undefined : sortable.transition,
      }}
      className={`board-card ${overdue ? "overdue-card" : ""} ${sortable.isDragging ? "dragging" : ""}`}
      {...sortable.attributes}
      {...sortable.listeners}
      onClick={() => {
        if (wasDragged.current) {
          wasDragged.current = false;
          return;
        }
        open();
      }}
    >
      <div className="board-card-title">
        <b>{card.title}</b>
        <GripVertical className="card-grip" />
      </div>
      {card.deadline && (
        <span className="card-deadline">
          <Calendar /> До{" "}
          {new Intl.DateTimeFormat("ru-RU").format(
            new Date(`${card.deadline.slice(0, 10)}T00:00:00`),
          )}
        </span>
      )}
    </article>
  );
}

function SortableColumn({
  column,
  rename,
  remove,
  addCard,
  openCard,
}: {
  column: BoardColumn;
  rename: () => void;
  remove: () => void;
  addCard: () => void;
  openCard: (card: BoardCard) => void;
}) {
  const sortable = useSortable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });
  return (
    <section
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={`board-column ${sortable.isDragging ? "dragging" : ""}`}
    >
      <div className="board-column-head">
        <button
          className="drag-handle"
          {...sortable.attributes}
          {...sortable.listeners}
          aria-label="Переместить столбец"
        >
          <GripVertical />
        </button>
        <b>{column.name}</b>
        <span>{column.cards.length}</span>
        <button onClick={rename} aria-label="Переименовать">
          <Pencil />
        </button>
        <button onClick={remove} aria-label="Удалить">
          <Trash2 />
        </button>
      </div>
      <SortableContext
        items={column.cards.map((card) => `card-${card.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="board-card-list">
          {column.cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              open={() => openCard(card)}
            />
          ))}
          {!column.cards.length && (
            <div className="column-empty">Перетащите карточку сюда</div>
          )}
        </div>
      </SortableContext>
      <button className="add-card" onClick={addCard}>
        <Plus /> Добавить карточку
      </button>
    </section>
  );
}

function ArchiveDropzone({ active }: { active: boolean }) {
  const droppable = useDroppable({
    id: "card-archive",
    data: { type: "archive" },
  });
  return (
    <div
      ref={droppable.setNodeRef}
      className={`archive-dropzone ${active ? "ready" : ""} ${droppable.isOver ? "over" : ""}`}
    >
      <Archive />
      <span>
        {droppable.isOver
          ? "Отпустите, чтобы архивировать"
          : "Перетащите карточку в архив"}
      </span>
    </div>
  );
}

function CardDialog({
  card,
  columnId,
  close,
  save,
  remove,
}: {
  card: BoardCard | null;
  columnId: number;
  close: () => void;
  save: (data: {
    title: string;
    description: string;
    deadline: string | null;
  }) => Promise<void>;
  remove?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(
      new FormData(event.currentTarget),
    ) as Record<string, string>;
    try {
      await save({
        title: values.title,
        description: values.description,
        deadline: values.deadline || null,
      });
      close();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const deleteCard = async () => {
    if (!remove || !window.confirm("Удалить карточку?")) return;
    setBusy(true);
    setError("");
    try {
      await remove();
      close();
    } catch (reason) {
      setError(errorText(reason));
      setBusy(false);
    }
  };
  return (
    <Dialog title={card ? "Карточка" : "Новая карточка"} close={close}>
      <form onSubmit={submit}>
        <label className="field">
          <span>Название</span>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={card?.title ?? ""}
            autoFocus
          />
        </label>
        <label className="field">
          <span>Срок</span>
          <input
            name="deadline"
            type="date"
            defaultValue={card?.deadline?.slice(0, 10) ?? ""}
          />
        </label>
        <label className="field">
          <span>Описание</span>
          <textarea
            name="description"
            rows={7}
            maxLength={5000}
            defaultValue={card?.description ?? ""}
          />
        </label>
        {error && (
          <div className="form-error">
            <AlertTriangle />
            {error}
          </div>
        )}
        <div className="modal-actions">
          {remove && (
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => void deleteCard()}
            >
              <Trash2 /> Удалить
            </button>
          )}
          <button type="button" className="button secondary" onClick={close}>
            Отмена
          </button>
          <button className="button" disabled={busy}>
            {card ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function NameDialog({
  title,
  label,
  initialValue = "",
  close,
  save,
}: {
  title: string;
  label: string;
  initialValue?: string;
  close: () => void;
  save: (name: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const name = String(
      new FormData(event.currentTarget).get("name") ?? "",
    ).trim();
    try {
      await save(name);
      close();
    } catch (reason) {
      setError(errorText(reason));
      setBusy(false);
    }
  };
  return (
    <Dialog title={title} close={close}>
      <form onSubmit={submit}>
        <label className="field">
          <span>{label}</span>
          <input
            name="name"
            required
            minLength={1}
            maxLength={120}
            defaultValue={initialValue}
            autoFocus
          />
        </label>
        {error && (
          <div className="form-error">
            <AlertTriangle />
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={close}>
            Отмена
          </button>
          <button className="button" disabled={busy}>
            Сохранить
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function AccessDialog({
  board,
  close,
}: {
  board: BoardDetails;
  close: () => void;
}) {
  const [users, setUsers] = useState<BoardAccessUser[]>([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [busyId, setBusyId] = useState<number | null>(null);
  const load = async () => {
    try {
      setUsers(await api<BoardAccessUser[]>(`/boards/${board.id}/access`));
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  useEffect(() => {
    void load();
  }, [board.id]);
  const visible = useMemo(
    () =>
      users.filter((user) =>
        `${user.ipName} ${user.email}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [users, search],
  );
  const toggle = async (user: BoardAccessUser) => {
    if (user.isOwner) return;
    setBusyId(user.id);
    setError("");
    try {
      await api(
        `/boards/${board.id}/access${user.hasAccess ? `/${user.id}` : ""}`,
        {
          method: user.hasAccess ? "DELETE" : "POST",
          ...(user.hasAccess
            ? {}
            : { body: JSON.stringify({ userId: user.id }) }),
        },
      );
      await load();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusyId(null);
    }
  };
  return (
    <Dialog title="Доступ к доске" close={close} wide>
      <div className="board-access-search">
        <Search />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск сотрудника"
        />
      </div>
      {error && (
        <div className="form-error">
          <AlertTriangle />
          {error}
        </div>
      )}
      <div className="board-access-list">
        {visible.map((user) => (
          <div key={user.id}>
            <span className="avatar">
              {user.ipName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <b>{user.ipName}</b>
              <small>{user.email}</small>
            </div>
            {user.isOwner ? (
              <span className="owner-badge">
                <LockKeyhole /> Создатель
              </span>
            ) : (
              <button
                disabled={busyId === user.id}
                className={`button compact ${user.hasAccess ? "secondary" : ""}`}
                onClick={() => void toggle(user)}
              >
                {user.hasAccess ? "Убрать доступ" : "Выдать доступ"}
              </button>
            )}
          </div>
        ))}
      </div>
    </Dialog>
  );
}

export function BoardsPage({
  user,
  type,
  refreshKey = 0,
}: {
  user: User;
  type: BoardType;
  refreshKey?: number;
}) {
  const [boards, setBoards] = useState<BoardSummary[]>([]),
    [selectedId, setSelectedId] = useState<number | null>(null),
    [board, setBoard] = useState<BoardDetails | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [cardEditor, setCardEditor] = useState<{
      card: BoardCard | null;
      columnId: number;
    } | null>(null),
    [accessOpen, setAccessOpen] = useState(false);
  const [nameEditor, setNameEditor] = useState<{
    kind: "create-board" | "rename-board" | "create-column" | "rename-column";
    column?: BoardColumn;
  } | null>(null);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const canCreate =
    type === "PERSONAL" ||
    user.role === "DIRECTOR" ||
    user.role === "DEPARTMENT_HEAD";
  const isOwner = board?.ownerId === user.id;

  const loadBoards = async (preferredId?: number) => {
    setLoading(true);
    setError("");
    try {
      const list = await api<BoardSummary[]>(`/boards?type=${type}`);
      setBoards(list);
      setSelectedId((previous) => {
        const wanted = preferredId ?? previous;
        return wanted && list.some((item) => item.id === wanted)
          ? wanted
          : (list[0]?.id ?? null);
      });
      if (!list.length) setBoard(null);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };
  const loadBoard = async (id = selectedId) => {
    if (!id) return;
    try {
      setError("");
      setBoard(await api<BoardDetails>(`/boards/${id}`));
    } catch (reason) {
      setError(errorText(reason));
      if (reason instanceof ApiError && [403, 404].includes(reason.status))
        await loadBoards();
    }
  };
  useEffect(() => {
    setBoard(null);
    setSelectedId(null);
    void loadBoards();
  }, [type]);
  useEffect(() => {
    if (refreshKey) {
      void loadBoards();
      void loadBoard();
    }
  }, [refreshKey]);
  useEffect(() => {
    if (selectedId) void loadBoard(selectedId);
  }, [selectedId]);

  const onConflict = async (reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 409) {
      setNotice("Данные были изменены другим пользователем");
      await loadBoard();
      return;
    }
    if (reason instanceof ApiError && reason.status === 404) await loadBoard();
    throw reason;
  };
  const saveName = async (name: string) => {
    if (!nameEditor) return;
    if (nameEditor.kind === "create-board") {
      const created = await api<BoardSummary>("/boards", {
        method: "POST",
        body: JSON.stringify({ name, type }),
      });
      await loadBoards(created.id);
      return;
    }
    if (!board) return;
    if (nameEditor.kind === "rename-board") {
      await api(`/boards/${board.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await loadBoards(board.id);
      await loadBoard(board.id);
      return;
    }
    if (nameEditor.kind === "create-column") {
      await api(`/boards/${board.id}/columns`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadBoard();
      return;
    }
    const column = nameEditor.column!;
    try {
      await api(`/boards/columns/${column.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, version: column.version }),
      });
      await loadBoard();
    } catch (reason) {
      await onConflict(reason);
    }
  };
  const deleteBoard = async () => {
    if (!board || !window.confirm(`Удалить доску «${board.name}»?`)) return;
    try {
      await api(`/boards/${board.id}`, { method: "DELETE" });
      setBoard(null);
      await loadBoards();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const deleteColumn = async (column: BoardColumn) => {
    const warning = column.cards.length
      ? `В столбце ${column.cards.length} карточек. Удалить столбец вместе с ними?`
      : `Удалить столбец «${column.name}»?`;
    if (!window.confirm(warning)) return;
    try {
      await api(`/boards/columns/${column.id}`, {
        method: "DELETE",
        body: JSON.stringify({ version: column.version }),
      });
      await loadBoard();
    } catch (reason) {
      try {
        await onConflict(reason);
      } catch {
        setError(errorText(reason));
      }
    }
  };
  const saveCard = async (data: {
    title: string;
    description: string;
    deadline: string | null;
  }) => {
    if (!cardEditor) return;
    try {
      if (cardEditor.card)
        await api(`/boards/cards/${cardEditor.card.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...data, version: cardEditor.card.version }),
        });
      else
        await api(`/boards/columns/${cardEditor.columnId}/cards`, {
          method: "POST",
          body: JSON.stringify(data),
        });
      await loadBoard();
    } catch (reason) {
      await onConflict(reason);
    }
  };
  const deleteCard = async () => {
    if (!cardEditor?.card) return;
    try {
      await api(`/boards/cards/${cardEditor.card.id}`, {
        method: "DELETE",
        body: JSON.stringify({ version: cardEditor.card.version }),
      });
      await loadBoard();
    } catch (reason) {
      await onConflict(reason);
    }
  };
  const dragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveCard(null);
    if (!board || !over || active.id === over.id) return;
    const activeData = active.data.current,
      overData = over.data.current;
    if (activeData?.type === "column" && overData?.type === "column") {
      const from = board.columns.findIndex(
          (item) => item.id === activeData.columnId,
        ),
        to = board.columns.findIndex((item) => item.id === overData.columnId);
      if (from < 0 || to < 0) return;
      const previous = board,
        columns = [...board.columns],
        [moved] = columns.splice(from, 1);
      columns.splice(to, 0, moved);
      setBoard({ ...board, columns });
      try {
        setBoard(
          await api<BoardDetails>(`/boards/columns/${moved.id}/move`, {
            method: "POST",
            body: JSON.stringify({ position: to, version: moved.version }),
          }),
        );
      } catch (reason) {
        setBoard(previous);
        try {
          await onConflict(reason);
        } catch {
          setError(errorText(reason));
        }
      }
      return;
    }
    if (activeData?.type !== "card") return;
    const sourceColumn = board.columns.find(
      (item) => item.id === activeData.columnId,
    );
    const movedCard = sourceColumn?.cards.find(
      (item) => item.id === activeData.cardId,
    );
    if (!sourceColumn || !movedCard) return;
    if (overData?.type === "archive") {
      const previous = board;
      setBoard({
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => card.id !== movedCard.id),
        })),
      });
      try {
        await api(`/boards/cards/${movedCard.id}/archive`, {
          method: "POST",
          body: JSON.stringify({ version: movedCard.version }),
        });
      } catch (reason) {
        setBoard(previous);
        try {
          await onConflict(reason);
        } catch {
          setError(errorText(reason));
        }
      }
      return;
    }
    const targetColumnId =
      overData?.type === "card"
        ? Number(overData.columnId)
        : overData?.type === "column"
          ? Number(overData.columnId)
          : null;
    const targetColumn = board.columns.find(
      (item) => item.id === targetColumnId,
    );
    if (!targetColumn) return;
    const targetIndex =
      overData?.type === "card"
        ? Math.max(
            0,
            targetColumn.cards.findIndex((item) => item.id === overData.cardId),
          )
        : targetColumn.cards.length;
    const previous = board;
    const columns = board.columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => card.id !== movedCard.id),
    }));
    const targetCopy = columns.find((column) => column.id === targetColumn.id)!;
    targetCopy.cards.splice(Math.min(targetIndex, targetCopy.cards.length), 0, {
      ...movedCard,
      columnId: targetColumn.id,
    });
    setBoard({ ...board, columns });
    try {
      setBoard(
        await api<BoardDetails>(`/boards/cards/${movedCard.id}/move`, {
          method: "POST",
          body: JSON.stringify({
            targetColumnId: targetColumn.id,
            position: targetIndex,
            version: movedCard.version,
          }),
        }),
      );
    } catch (reason) {
      setBoard(previous);
      try {
        await onConflict(reason);
      } catch {
        setError(errorText(reason));
      }
    }
  };

  return (
    <section className="boards-page">
      <div className="board-tabs">
        <div>
          {boards.map((item) => (
            <button
              key={item.id}
              className={selectedId === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {canCreate && (
          <button
            className="board-add"
            onClick={() => setNameEditor({ kind: "create-board" })}
            aria-label="Создать доску"
          >
            <Plus />
          </button>
        )}
      </div>
      {error && (
        <div className="page-error">
          <AlertTriangle />
          {error}
        </div>
      )}
      {notice && (
        <div className="board-notice">
          <AlertTriangle />
          {notice}
          <button onClick={() => setNotice("")}>
            <X />
          </button>
        </div>
      )}
      {loading && !board ? (
        <div className="loading-line">Загрузка досок…</div>
      ) : !board ? (
        <div className="panel board-empty">
          <Users />
          <h2>Командных досок пока нет</h2>
          <p>
            {canCreate
              ? "Создайте первую доску и выдайте доступ сотрудникам."
              : "Попросите создателя доски выдать вам доступ."}
          </p>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={({ active }) => {
              const data = active.data.current;
              if (data?.type === "card")
                setActiveCard(
                  board.columns
                    .flatMap((column) => column.cards)
                    .find((card) => card.id === data.cardId) ?? null,
                );
            }}
            onDragCancel={() => setActiveCard(null)}
            onDragEnd={(event) => void dragEnd(event)}
          >
            <div className="board-toolbar">
              <div>
                <b>{board.name}</b>
                {type === "TEAM" && (
                  <span>Создатель: {board.owner.ipName}</span>
                )}
              </div>
              <ArchiveDropzone active={Boolean(activeCard)} />
              <div>
                {isOwner && type === "TEAM" && (
                  <button
                    className="button secondary compact"
                    onClick={() => setAccessOpen(true)}
                  >
                    <Users /> Доступ
                  </button>
                )}
                {isOwner && (
                  <button
                    className="button ghost compact"
                    onClick={() => setNameEditor({ kind: "rename-board" })}
                  >
                    <Pencil /> Переименовать
                  </button>
                )}
                {isOwner && (
                  <button
                    className="button ghost compact danger-text"
                    onClick={() => void deleteBoard()}
                  >
                    <Trash2 /> Удалить
                  </button>
                )}
                <button
                  className="button compact"
                  onClick={() => setNameEditor({ kind: "create-column" })}
                >
                  <Plus /> Столбец
                </button>
              </div>
            </div>
            <SortableContext
              items={board.columns.map((column) => `column-${column.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="kanban-canvas">
                {board.columns.map((column) => (
                  <SortableColumn
                    key={column.id}
                    column={column}
                    rename={() =>
                      setNameEditor({ kind: "rename-column", column })
                    }
                    remove={() => void deleteColumn(column)}
                    addCard={() =>
                      setCardEditor({ card: null, columnId: column.id })
                    }
                    openCard={(card) =>
                      setCardEditor({ card, columnId: column.id })
                    }
                  />
                ))}
                {!board.columns.length && (
                  <button
                    className="first-column"
                    onClick={() => setNameEditor({ kind: "create-column" })}
                  >
                    <Plus />
                    <b>Добавьте первый столбец</b>
                    <span>Например: «Новые», «В работе», «Готово»</span>
                  </button>
                )}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }}>
              {activeCard && (
                <article
                  className={`board-card board-card-overlay ${activeCard.deadline && activeCard.deadline.slice(0, 10) < localToday() ? "overdue-card" : ""}`}
                >
                  <div className="board-card-title">
                    <b>{activeCard.title}</b>
                    <GripVertical className="card-grip" />
                  </div>
                  {activeCard.deadline && (
                    <span className="card-deadline">
                      <Calendar /> До{" "}
                      {new Intl.DateTimeFormat("ru-RU").format(
                        new Date(
                          `${activeCard.deadline.slice(0, 10)}T00:00:00`,
                        ),
                      )}
                    </span>
                  )}
                </article>
              )}
            </DragOverlay>
          </DndContext>
        </>
      )}
      {cardEditor && (
        <CardDialog
          card={cardEditor.card}
          columnId={cardEditor.columnId}
          close={() => setCardEditor(null)}
          save={saveCard}
          remove={cardEditor.card ? deleteCard : undefined}
        />
      )}
      {nameEditor && (
        <NameDialog
          title={
            nameEditor.kind === "create-board"
              ? "Новая доска"
              : nameEditor.kind === "rename-board"
                ? "Переименовать доску"
                : nameEditor.kind === "create-column"
                  ? "Новый столбец"
                  : "Переименовать столбец"
          }
          label={
            nameEditor.kind.includes("board")
              ? "Название доски"
              : "Название столбца"
          }
          initialValue={
            nameEditor.kind === "rename-board"
              ? board?.name
              : nameEditor.column?.name
          }
          close={() => setNameEditor(null)}
          save={saveName}
        />
      )}
      {accessOpen && board && (
        <AccessDialog board={board} close={() => setAccessOpen(false)} />
      )}
    </section>
  );
}
