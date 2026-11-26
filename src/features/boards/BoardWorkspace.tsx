import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Calendar, GripVertical, Plus } from "lucide-react";
import { SortableColumn, localToday } from "./BoardCanvas";
import { BoardToolbar } from "./BoardToolbar";
import type {
  BoardCard,
  BoardColumn,
  BoardDetails,
  BoardType,
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

export function BoardWorkspace({
  board,
  sensors,
  activeCard,
  setActiveCard,
  onDragEnd,
  type,
  isOwner,
  onArchive,
  onLayout,
  onAccess,
  onRenameBoard,
  onDeleteBoard,
  onAddColumn,
  onConfigureColumn,
  onRenameColumn,
  onDeleteColumn,
  onAddCard,
  onOpenCard,
}: {
  board: BoardDetails;
  sensors: ReturnType<typeof useSensors>;
  activeCard: BoardCard | null;
  setActiveCard: (card: BoardCard | null) => void;
  onDragEnd: (event: DragEndEvent) => void;
  type: BoardType;
  isOwner: boolean;
  onArchive: () => void;
  onLayout: (columnId: number | null) => void;
  onAccess: () => void;
  onRenameBoard: () => void;
  onDeleteBoard: () => void;
  onAddColumn: () => void;
  onConfigureColumn: (columnId: number) => void;
  onRenameColumn: (column: BoardColumn) => void;
  onDeleteColumn: (column: BoardColumn) => void;
  onAddCard: (columnId: number) => void;
  onOpenCard: (card: BoardCard, columnId: number) => void;
}) {
  return (
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
      onDragEnd={onDragEnd}
    >
      <BoardToolbar
        board={board}
        type={type}
        isOwner={isOwner}
        active={Boolean(activeCard)}
        onArchive={onArchive}
        onLayout={() => onLayout(null)}
        onAccess={onAccess}
        onRename={onRenameBoard}
        onDelete={onDeleteBoard}
        onAddColumn={onAddColumn}
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
              configure={() => onConfigureColumn(column.id)}
              rename={() => onRenameColumn(column)}
              remove={() => onDeleteColumn(column)}
              addCard={() => onAddCard(column.id)}
              openCard={(card) => onOpenCard(card, column.id)}
            />
          ))}
          {!board.columns.length && (
            <button className="first-column" onClick={onAddColumn}>
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
                  new Date(`${activeCard.deadline.slice(0, 10)}T00:00:00`),
                )}
              </span>
            )}
          </article>
        )}
      </DragOverlay>
    </DndContext>
  );
}
