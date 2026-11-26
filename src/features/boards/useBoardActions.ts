import { type Dispatch, type SetStateAction } from "react";
import { ApiError } from "../../api";
import { boardRequest, useBoardMutation } from "./queries";
import { errorText } from "./BoardDialog";
import { createBoardDragHandler } from "./board-drag";
import type {
  BoardCard,
  BoardColumn,
  BoardDetails,
  BoardSummary,
  BoardType,
} from "../../types";

export type BoardNameEditor = {
  kind: "create-board" | "rename-board" | "create-column" | "rename-column";
  column?: BoardColumn;
};
export type BoardCardEditor = { card: BoardCard | null; columnId: number };

type BoardActionOptions = {
  type: BoardType;
  board: BoardDetails | null;
  setBoard: Dispatch<SetStateAction<BoardDetails | null>>;
  nameEditor: BoardNameEditor | null;
  cardEditor: BoardCardEditor | null;
  setActiveCard: Dispatch<SetStateAction<BoardCard | null>>;
  loadBoards: (preferredId?: number) => Promise<void>;
  loadBoard: (id?: number) => Promise<void>;
  setError: (message: string) => void;
  setNotice: (message: string) => void;
};

export function useBoardActions({
  type,
  board,
  setBoard,
  nameEditor,
  cardEditor,
  setActiveCard,
  loadBoards,
  loadBoard,
  setError,
  setNotice,
}: BoardActionOptions) {
  const boardMutation = useBoardMutation();
  const onConflict = async (reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 409) {
      setNotice("Данные были изменены другим пользователем");
      await loadBoard();
      return;
    }
    if (reason instanceof ApiError && reason.status === 404) await loadBoard();
    throw reason;
  };
  const dragEnd = createBoardDragHandler({
    board,
    setBoard,
    setActiveCard,
    boardMutation,
    onConflict,
    setError,
  });
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
      await boardMutation.mutateAsync({
        path: `/boards/${board.id}`,
        init: {
          method: "PATCH",
          body: JSON.stringify({ name }),
        },
      });
      await loadBoards(board.id);
      await loadBoard(board.id);
      return;
    }
    if (nameEditor.kind === "create-column") {
      await boardMutation.mutateAsync({
        path: `/boards/${board.id}/columns`,
        init: {
          method: "POST",
          body: JSON.stringify({ name }),
        },
      });
      await loadBoard();
      return;
    }
    const column = nameEditor.column!;
    try {
      await boardMutation.mutateAsync({
        path: `/boards/columns/${column.id}`,
        init: {
          method: "PATCH",
          body: JSON.stringify({ name, version: column.version }),
        },
      });
      await loadBoard();
    } catch (reason) {
      await onConflict(reason);
    }
  };
  const deleteBoard = async () => {
    if (!board || !window.confirm(`Удалить доску «${board.name}»?`)) return;
    try {
      await boardMutation.mutateAsync({
        path: `/boards/${board.id}`,
        init: { method: "DELETE" },
      });
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
      await boardMutation.mutateAsync({
        path: `/boards/columns/${column.id}`,
        init: {
          method: "DELETE",
          body: JSON.stringify({ version: column.version }),
        },
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
        await boardMutation.mutateAsync({
          path: `/boards/cards/${cardEditor.card.id}`,
          init: {
            method: "PATCH",
            body: JSON.stringify({ ...data, version: cardEditor.card.version }),
          },
        });
      else
        await boardMutation.mutateAsync({
          path: `/boards/columns/${cardEditor.columnId}/cards`,
          init: {
            method: "POST",
            body: JSON.stringify(data),
          },
        });
      await loadBoard();
    } catch (reason) {
      await onConflict(reason);
    }
  };
  const deleteCard = async () => {
    if (!cardEditor?.card) return;
    try {
      await boardMutation.mutateAsync({
        path: `/boards/cards/${cardEditor.card.id}`,
        init: {
          method: "DELETE",
          body: JSON.stringify({ version: cardEditor.card.version }),
        },
      });
      await loadBoard();
    } catch (reason) {
      await onConflict(reason);
    }
  };
  return {
    dragEnd,
    saveName,
    deleteBoard,
    deleteColumn,
    saveCard,
    deleteCard,
    boardMutation,
  };
}
