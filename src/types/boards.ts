import type { User } from "../types";
import type { BoardAccessUserDTO } from "@crm/shared-types";

export type BoardType = "PERSONAL" | "TEAM";

export interface BoardSummary {
  id: number;
  name: string;
  type: BoardType;
  ownerId: number;
  owner: Pick<User, "id" | "ipName">;
  createdAt: string;
  updatedAt: string;
}

export interface BoardCard {
  id: number;
  columnId: number;
  title: string;
  description?: string | null;
  deadline?: string | null;
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface BoardColumn {
  id: number;
  boardId: number;
  name: string;
  position: number;
  version: number;
  width: number;
  cardsPerRow: number;
  cards: BoardCard[];
}

export interface BoardDetails extends BoardSummary {
  columns: BoardColumn[];
  archivedCardCount: number;
}

export interface ArchivedBoardCard extends BoardCard {
  archivedAt: string;
  column: Pick<BoardColumn, "id" | "name">;
}
export type BoardAccessUser = BoardAccessUserDTO;
