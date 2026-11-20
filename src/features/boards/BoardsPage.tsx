import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  AlertTriangle,
  Calendar,
  GripVertical,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api";
import {
  boardRequest,
  getBoardAccess,
  getBoardArchive,
  restoreBoardCard,
  updateBoardAccess,
  updateBoardLayout,
} from "./queries";
import { queryKeys } from "../../shared/queryKeys";
import { errorText } from "./BoardDialog";
import { CardDialog, NameDialog } from "./BoardDialogs";
import { AccessDialog } from "./BoardAccessDialog";
import { BoardArchiveDialog } from "./BoardArchiveDialog";
import { SortableColumn, localToday } from "./BoardCanvas";
import { BoardToolbar } from "./BoardToolbar";
import { BoardLayoutDialog } from "./BoardLayoutDialog";
import type {
  BoardCard,
  BoardColumn,
  BoardDetails,
  BoardAccessUser,
  BoardSummary,
  BoardType,
  User,
} from "../../types";

const boardCollisions: CollisionDetection = (args) => {
  if (args.active.data.current?.type === "column") {
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (item) => item.data.current?.type === "column",
      ),
    });
  }
  const hits = pointerWithin(args);
  const archive = hits.filter((hit) => hit.id === "card-archive");
  if (archive.length) return archive;
  const cards = hits.filter(
    (hit) =>
      args.droppableContainers.find((item) => item.id === hit.id)?.data.current
        ?.type === "card",
  );
  if (cards.length) return cards;
  if (hits.length) return hits;
  return closestCorners({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (item) => item.id !== "card-archive",
    ),
  });
};

export function BoardsPage({
  user,
  type,
  refreshKey = 0,
}: {
  user: User;
  type: BoardType;
  refreshKey?: number;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = Number(searchParams.get("boardId")) || null;
  const [boards, setBoards] = useState<BoardSummary[]>([]),
    [board, setBoard] = useState<BoardDetails | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [cardEditor, setCardEditor] = useState<{
      card: BoardCard | null;
      columnId: number;
    } | null>(null),
    [accessOpen, setAccessOpen] = useState(false),
    [archiveOpen, setArchiveOpen] = useState(false),
    [layoutEditor, setLayoutEditor] = useState<{
      columnId: number | null;
    } | null>(null);
  const [nameEditor, setNameEditor] = useState<{
    kind: "create-board" | "rename-board" | "create-column" | "rename-column";
    column?: BoardColumn;
  } | null>(null);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [accessUsers, setAccessUsers] = useState<BoardAccessUser[]>([]);
  const [accessError, setAccessError] = useState("");
  const accessBoardId = board?.id;
  const queryClient = useQueryClient();
  const selectBoard = useCallback(
    (id: number | null, replace = false) => {
      const value = id === null ? null : String(id);
      if (searchParams.get("boardId") === value) return;
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (id === null) next.delete("boardId");
          else next.set("boardId", String(id));
          return next;
        },
        { replace },
      );
    },
    [searchParams, setSearchParams],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const canCreate =
    type === "PERSONAL" ||
    user.role === "DIRECTOR" ||
    user.role === "DEPARTMENT_HEAD";
  const isOwner = board?.ownerId === user.id;

  const loadBoards = useCallback(
    async (preferredId?: number) => {
      setLoading(true);
      setError("");
      try {
        const list = await queryClient.fetchQuery({
          queryKey: queryKeys.boards.all(type),
          queryFn: () => boardRequest<BoardSummary[]>(`/boards?type=${type}`),
          staleTime: 0,
        });
        setBoards(list);
        const wanted = preferredId ?? selectedId;
        const nextId =
          wanted && list.some((item) => item.id === wanted)
            ? wanted
            : (list[0]?.id ?? null);
        selectBoard(nextId, true);
        if (!list.length) setBoard(null);
      } catch (reason) {
        setError(errorText(reason));
      } finally {
        setLoading(false);
      }
    },
    [queryClient, selectBoard, selectedId, type],
  );
  const loadBoard = useCallback(
    async (id = selectedId) => {
      if (!id) return;
      try {
        setError("");
        setBoard(
          await queryClient.fetchQuery({
            queryKey: queryKeys.boards.detail(type, id),
            queryFn: () => boardRequest<BoardDetails>(`/boards/${id}`),
            staleTime: 0,
          }),
        );
      } catch (reason) {
        setError(errorText(reason));
        if (reason instanceof ApiError && [403, 404].includes(reason.status))
          await loadBoards();
      }
    },
    [loadBoards, queryClient, selectedId, type],
  );
  useEffect(() => {
    setBoard(null);
    void loadBoards();
  }, [loadBoards, type]);
  useEffect(() => {
    if (refreshKey) {
      void loadBoards();
      void loadBoard();
    }
  }, [loadBoard, loadBoards, refreshKey]);
  useEffect(() => {
    setArchiveOpen(false);
    setLayoutEditor(null);
    setCardEditor(null);
    setNameEditor(null);
    setAccessOpen(false);
    if (selectedId) void loadBoard(selectedId);
  }, [loadBoard, selectedId]);
  useEffect(() => {
    if (!accessOpen || accessBoardId === undefined) return;
    let active = true;
    setAccessError("");
    getBoardAccess(accessBoardId)
      .then((users) => {
        if (active) setAccessUsers(users);
      })
      .catch((reason) => {
        if (active) setAccessError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [accessOpen, accessBoardId]);

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
      const created = await boardRequest<BoardSummary>("/boards", {
        method: "POST",
        body: JSON.stringify({ name, type }),
      });
      await loadBoards(created.id);
      return;
    }
    if (!board) return;
    if (nameEditor.kind === "rename-board") {
      await boardRequest(`/boards/${board.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await loadBoards(board.id);
      await loadBoard(board.id);
      return;
    }
    if (nameEditor.kind === "create-column") {
      await boardRequest(`/boards/${board.id}/columns`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadBoard();
      return;
    }
    const column = nameEditor.column!;
    try {
      await boardRequest(`/boards/columns/${column.id}`, {
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
      await boardRequest(`/boards/${board.id}`, { method: "DELETE" });
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
      await boardRequest(`/boards/columns/${column.id}`, {
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
        await boardRequest(`/boards/cards/${cardEditor.card.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...data, version: cardEditor.card.version }),
        });
      else
        await boardRequest(`/boards/columns/${cardEditor.columnId}/cards`, {
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
      await boardRequest(`/boards/cards/${cardEditor.card.id}`, {
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
      if (!moved) return;
      columns.splice(to, 0, moved);
      setBoard({ ...board, columns });
      try {
        setBoard(
          await boardRequest<BoardDetails>(`/boards/columns/${moved.id}/move`, {
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
        archivedCardCount: board.archivedCardCount + 1,
        columns: board.columns.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => card.id !== movedCard.id),
        })),
      });
      try {
        await boardRequest(`/boards/cards/${movedCard.id}/archive`, {
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
        await boardRequest<BoardDetails>(`/boards/cards/${movedCard.id}/move`, {
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
              onClick={() => selectBoard(item.id)}
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
            collisionDetection={boardCollisions}
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
            <BoardToolbar
              board={board}
              type={type}
              isOwner={isOwner}
              active={Boolean(activeCard)}
              onArchive={() => setArchiveOpen(true)}
              onLayout={() => setLayoutEditor({ columnId: null })}
              onAccess={() => setAccessOpen(true)}
              onRename={() => setNameEditor({ kind: "rename-board" })}
              onDelete={() => void deleteBoard()}
              onAddColumn={() => setNameEditor({ kind: "create-column" })}
            />
            <SortableContext
              items={board.columns.map((column) => `column-${column.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="kanban-canvas">
                {board.columns.map((column) => (
                  <SortableColumn
                    key={column.id}
                    column={column}
                    configure={() => setLayoutEditor({ columnId: column.id })}
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
      {archiveOpen && board && (
        <BoardArchiveDialog
          key={board.id}
          board={board}
          refreshKey={refreshKey}
          close={() => setArchiveOpen(false)}
          updated={(updated) =>
            setBoard((current) =>
              current?.id === updated.id ? updated : current,
            )
          }
          refresh={() => loadBoard(board.id)}
          loadArchive={getBoardArchive}
          restoreCard={restoreBoardCard}
        />
      )}
      {layoutEditor && board && (
        <BoardLayoutDialog
          key={board.id}
          board={board}
          initialColumnId={layoutEditor.columnId}
          close={() => setLayoutEditor(null)}
          updated={(updated) =>
            setBoard((current) =>
              current?.id === updated.id ? updated : current,
            )
          }
          refresh={() => loadBoard(board.id)}
          saveLayout={updateBoardLayout}
        />
      )}
      {cardEditor && (
        <CardDialog
          card={cardEditor.card}
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
        <AccessDialog
          users={accessUsers}
          loadError={accessError}
          close={() => setAccessOpen(false)}
          updateAccess={async (targetUser) => {
            await updateBoardAccess(board.id, targetUser);
            setAccessUsers(await getBoardAccess(board.id));
          }}
        />
      )}
    </section>
  );
}
