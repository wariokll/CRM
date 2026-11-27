import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../../api";
import {
  boardRequest,
  getBoardAccess,
  useBoardDetailsMutation,
} from "../queries";
import {
  useBoardActions,
  type BoardCardEditor,
  type BoardNameEditor,
} from "./useBoardActions";
import { queryKeys } from "../../../shared/queryKeys";
import { errorText } from "../components/BoardDialog";
import type {
  BoardCard,
  BoardDetails,
  BoardAccessUser,
  BoardSummary,
  BoardType,
  User,
} from "../../../types";

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
    [cardEditor, setCardEditor] = useState<BoardCardEditor | null>(null),
    [accessOpen, setAccessOpen] = useState(false),
    [archiveOpen, setArchiveOpen] = useState(false),
    [layoutEditor, setLayoutEditor] = useState<{
      columnId: number | null;
    } | null>(null);
  const [nameEditor, setNameEditor] = useState<BoardNameEditor | null>(null);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [accessUsers, setAccessUsers] = useState<BoardAccessUser[]>([]);
  const [accessError, setAccessError] = useState("");
  const accessBoardId = board?.id;
  const queryClient = useQueryClient();
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

  const actions = useBoardActions({
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
  });

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
    ...actions,
    isOwner,
    setArchiveOpen,
    archiveOpen,
    setLayoutEditor,
    layoutEditor,
    setCardEditor,
    cardEditor,
    setNameEditor,
    nameEditor,
    setAccessOpen,
    accessOpen,
    activeCard,
    accessUsers,
    setAccessUsers,
    accessError,
    boardDetailsMutation,
    loadBoard,
  };
}
