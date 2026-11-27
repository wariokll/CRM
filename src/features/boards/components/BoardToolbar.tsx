import { Archive, Pencil, Plus, Settings2, Trash2, Users } from "lucide-react";
import type { BoardDetails, BoardType } from "../../../types";
import { ArchiveDropzone } from "./BoardCanvas";

export function BoardToolbar({
  board,
  type,
  isOwner,
  active,
  onArchive,
  onLayout,
  onAccess,
  onRename,
  onDelete,
  onAddColumn,
}: {
  board: BoardDetails;
  type: BoardType;
  isOwner: boolean;
  active: boolean;
  onArchive: () => void;
  onLayout: () => void;
  onAccess: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAddColumn: () => void;
}) {
  return (
    <div className="board-toolbar">
      <div>
        <b>{board.name}</b>
        {type === "TEAM" && <span>Создатель: {board.owner.ipName}</span>}
      </div>
      <ArchiveDropzone active={active} />
      <div>
        <button
          className="button secondary compact"
          onClick={() => onArchive()}
        >
          <Archive /> Архив{" "}
          <span className="board-archive-count">{board.archivedCardCount}</span>
        </button>
        <button
          className="button secondary compact"
          disabled={!board.columns.length}
          onClick={() => onLayout()}
        >
          <Settings2 /> Вид доски
        </button>
        {isOwner && type === "TEAM" && (
          <button
            className="button secondary compact"
            onClick={() => onAccess()}
          >
            <Users /> Доступ
          </button>
        )}
        {isOwner && (
          <button className="button ghost compact" onClick={() => onRename()}>
            <Pencil /> Переименовать
          </button>
        )}
        {isOwner && (
          <button
            className="button ghost compact danger-text"
            onClick={() => onDelete()}
          >
            <Trash2 /> Удалить
          </button>
        )}
        <button className="button compact" onClick={() => onAddColumn()}>
          <Plus /> Столбец
        </button>
      </div>
    </div>
  );
}
