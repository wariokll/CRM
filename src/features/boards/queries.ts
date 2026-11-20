import { api } from "../../api";
import type {
  ArchivedBoardCard,
  BoardAccessUser,
  BoardDetails,
} from "../../types";

export function boardRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}

export function getBoardAccess(boardId: number) {
  return boardRequest<BoardAccessUser[]>(`/boards/${boardId}/access`);
}

export function updateBoardAccess(boardId: number, user: BoardAccessUser) {
  return boardRequest(
    `/boards/${boardId}/access${user.hasAccess ? `/${user.id}` : ""}`,
    {
      method: user.hasAccess ? "DELETE" : "POST",
      ...(user.hasAccess ? {} : { body: JSON.stringify({ userId: user.id }) }),
    },
  );
}

export function updateBoardLayout(
  boardId: number,
  columns: {
    id: number;
    version: number;
    width: number;
    cardsPerRow: number;
  }[],
) {
  return boardRequest<BoardDetails>(`/boards/${boardId}/layout`, {
    method: "PATCH",
    body: JSON.stringify({ columns }),
  });
}

export function getBoardArchive(boardId: number, signal: AbortSignal) {
  return boardRequest<ArchivedBoardCard[]>(`/boards/${boardId}/archive`, {
    signal,
  });
}

export function restoreBoardCard(
  cardId: number,
  version: number,
  targetColumnId: number,
) {
  return boardRequest<BoardDetails>(`/boards/cards/${cardId}/restore`, {
    method: "POST",
    body: JSON.stringify({ version, targetColumnId }),
  });
}
