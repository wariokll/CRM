import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
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
import { getBoardAccess, getBoardArchive } from "./queries";
import { ErrorState, LoadingState } from "../../components/ui";
import { CardDialog, NameDialog } from "./BoardDialogs";
import { AccessDialog } from "./BoardAccessDialog";
import { BoardArchiveDialog } from "./BoardArchiveDialog";
import { SortableColumn, localToday } from "./BoardCanvas";
import { BoardToolbar } from "./BoardToolbar";
import { BoardLayoutDialog } from "./BoardLayoutDialog";
import { useBoardsPage } from "./useBoardsPage";
import type { BoardType, User } from "../../types";

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
  const {
    boards,
    selectedId,
    selectBoard,
    canCreate,
    error,
    notice,
    setNotice,
    loading,
    board,
    setBoard,
    sensors,
    setActiveCard,
    dragEnd,
    isOwner,
    setArchiveOpen,
    archiveOpen,
    setLayoutEditor,
    layoutEditor,
    setCardEditor,
    cardEditor,
    deleteColumn,
    setNameEditor,
    nameEditor,
    saveName,
    setAccessOpen,
    accessOpen,
    activeCard,
    accessUsers,
    setAccessUsers,
    accessError,
    deleteBoard,
    saveCard,
    deleteCard,
    boardMutation,
    boardDetailsMutation,
    loadBoard,
  } = useBoardsPage({ user, type, refreshKey });

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
        <ErrorState>
          <AlertTriangle />
          {error}
        </ErrorState>
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
        <LoadingState>Загрузка досок…</LoadingState>
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
          restoreCard={(cardId, version, targetColumnId) =>
            boardDetailsMutation.mutateAsync({
              path: `/boards/cards/${cardId}/restore`,
              init: {
                method: "POST",
                body: JSON.stringify({ version, targetColumnId }),
              },
            })
          }
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
          saveLayout={(boardId, columns) =>
            boardDetailsMutation.mutateAsync({
              path: `/boards/${boardId}/layout`,
              init: {
                method: "PATCH",
                body: JSON.stringify({ columns }),
              },
            })
          }
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
            await boardMutation.mutateAsync({
              path: `/boards/${board.id}/access${targetUser.hasAccess ? `/${targetUser.id}` : ""}`,
              init: {
                method: targetUser.hasAccess ? "DELETE" : "POST",
                ...(targetUser.hasAccess
                  ? {}
                  : { body: JSON.stringify({ userId: targetUser.id }) }),
              },
            });
            setAccessUsers(await getBoardAccess(board.id));
          }}
        />
      )}
    </section>
  );
}
