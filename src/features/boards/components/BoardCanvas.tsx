import { useEffect, useRef } from "react";
import {
  Calendar,
  GripVertical,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Archive,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardCard, BoardColumn } from "../../../types";

export function localToday() {
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

export function SortableColumn({
  column,
  rename,
  remove,
  addCard,
  openCard,
  configure,
}: {
  column: BoardColumn;
  rename: () => void;
  remove: () => void;
  addCard: () => void;
  openCard: (card: BoardCard) => void;
  configure: () => void;
}) {
  const sortable = useSortable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });
  return (
    <section
      ref={sortable.setNodeRef}
      style={{
        width: column.width,
        flexBasis: column.width,
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
        <button
          onClick={configure}
          aria-label={"Настроить вид столбца «" + column.name + "»"}
          title="Ширина и сетка карточек"
        >
          <Settings2 />
        </button>
        <button onClick={rename} aria-label="Переименовать">
          <Pencil />
        </button>
        <button onClick={remove} aria-label="Удалить">
          <Trash2 />
        </button>
      </div>
      <SortableContext
        items={column.cards.map((card) => `card-${card.id}`)}
        strategy={rectSortingStrategy}
      >
        <div
          className="board-card-list"
          style={{
            gridTemplateColumns:
              "repeat(" + column.cardsPerRow + ", minmax(0, 1fr))",
          }}
        >
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

export function ArchiveDropzone({ active }: { active: boolean }) {
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
