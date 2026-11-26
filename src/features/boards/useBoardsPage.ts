import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api";
import {
  boardRequest,
  getBoardAccess,
  useBoardDetailsMutation,
  useBoardMutation,
} from "./queries";
import { queryKeys } from "../../shared/queryKeys";
import { errorText } from "./BoardDialog";
import type {
  BoardCard,
  BoardColumn,
  BoardDetails,
  BoardAccessUser,
  BoardSummary,
  BoardType,
  User,
} from "../../types";

export function useBoardsPage({
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
  const boardMutation = useBoardMutation();
  const boardDetailsMutation = useBoardDetailsMutation();
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
    setNameEditor((current) =>
      current?.kind === "create-board" ? current : null,
    );
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

  return {
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
  };
}
