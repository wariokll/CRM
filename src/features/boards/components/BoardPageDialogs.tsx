import type { Dispatch, SetStateAction } from "react";
import type { BoardAccessUser, BoardCard, BoardDetails } from "../../../types";
import { useBoardDetailsMutation, useBoardMutation } from "../queries";
import { CardDialog, NameDialog } from "./BoardDialogs";
import { AccessDialog } from "./BoardAccessDialog";
import { BoardArchiveDialog } from "./BoardArchiveDialog";
import { BoardLayoutDialog } from "./BoardLayoutDialog";
import { getBoardAccess, getBoardArchive } from "../queries";

type NameEditor = {
  kind: "create-board" | "rename-board" | "create-column" | "rename-column";
  column?: BoardDetails["columns"][number];
};
type CardEditor = { card: BoardCard | null; columnId: number };
type BoardLayoutEditor = { columnId: number | null };
type CardForm = { title: string; description: string; deadline: string | null };

export function BoardPageDialogs({
  board,
  refreshKey,
  archiveOpen,
  setArchiveOpen,
  setBoard,
  loadBoard,
  layoutEditor,
  setLayoutEditor,
  boardDetailsMutation,
  cardEditor,
  setCardEditor,
  saveCard,
  deleteCard,
  nameEditor,
  setNameEditor,
  saveName,
  accessOpen,
  setAccessOpen,
  accessUsers,
  setAccessUsers,
  accessError,
  boardMutation,
}: {
  board: BoardDetails | null;
  refreshKey: number;
  archiveOpen: boolean;
  setArchiveOpen: Dispatch<SetStateAction<boolean>>;
  setBoard: Dispatch<SetStateAction<BoardDetails | null>>;
  loadBoard: (id?: number) => Promise<void>;
  layoutEditor: BoardLayoutEditor | null;
  setLayoutEditor: Dispatch<SetStateAction<BoardLayoutEditor | null>>;
  boardDetailsMutation: ReturnType<typeof useBoardDetailsMutation>;
  cardEditor: CardEditor | null;
  setCardEditor: Dispatch<SetStateAction<CardEditor | null>>;
  saveCard: (data: CardForm) => Promise<void>;
  deleteCard: () => Promise<void>;
  nameEditor: NameEditor | null;
  setNameEditor: Dispatch<SetStateAction<NameEditor | null>>;
  saveName: (name: string) => Promise<void>;
  accessOpen: boolean;
  setAccessOpen: Dispatch<SetStateAction<boolean>>;
  accessUsers: BoardAccessUser[];
  setAccessUsers: Dispatch<SetStateAction<BoardAccessUser[]>>;
  accessError: string;
  boardMutation: ReturnType<typeof useBoardMutation>;
}) {
  return (
    <>
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
    </>
  );
}
