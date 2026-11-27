import type { DragEndEvent } from "@dnd-kit/core";
import type { Dispatch, SetStateAction } from "react";
import { boardRequest } from "./queries";
import { errorText } from "./components/BoardDialog";
import type { BoardCard, BoardDetails } from "../../types";

type BoardMutation = {
  mutateAsync: (args: { path: string; init?: RequestInit }) => Promise<unknown>;
};

export function createBoardDragHandler({
  board,
  setBoard,
  setActiveCard,
  boardMutation,
  onConflict,
  setError,
}: {
  board: BoardDetails | null;
  setBoard: Dispatch<SetStateAction<BoardDetails | null>>;
  setActiveCard: Dispatch<SetStateAction<BoardCard | null>>;
  boardMutation: BoardMutation;
  onConflict: (reason: unknown) => Promise<void>;
  setError: (message: string) => void;
}) {
  return async ({ active, over }: DragEndEvent) => {
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
        await boardMutation.mutateAsync({
          path: `/boards/cards/${movedCard.id}/archive`,
          init: {
            method: "POST",
            body: JSON.stringify({ version: movedCard.version }),
          },
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
}
