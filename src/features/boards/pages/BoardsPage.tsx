import { AlertTriangle, Plus, Users, X } from "lucide-react";
import { ErrorState, LoadingState } from "../../../components/ui";
import { useBoardsPage } from "../hooks/useBoardsPage";
import { BoardPageDialogs } from "../components/BoardPageDialogs";
import { BoardWorkspace } from "../components/BoardWorkspace";
import type { BoardType, User } from "../../../types";

export function BoardsPage({
  user,
  type,
  refreshKey = 0,
}: {
  user: User;
  type: BoardType;
  refreshKey?: number;
}) {
  const {
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
  } = useBoardsPage({ user, type, refreshKey });

  return (
    <section className="boards-page">
      <div className="board-tabs">
        <div>
          {boards.map((item) => (
            <button
              key={item.id}
              className={selectedId === item.id ? "active" : ""}
              onClick={() => selectBoard(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {canCreate && (
          <button
            className="board-add"
            onClick={() => setNameEditor({ kind: "create-board" })}
            aria-label="Создать доску"
          >
            <Plus />
          </button>
        )}
      </div>
      {error && (
        <ErrorState>
          <AlertTriangle />
          {error}
        </ErrorState>
      )}
      {notice && (
        <div className="board-notice">
          <AlertTriangle />
          {notice}
          <button onClick={() => setNotice("")}>
            <X />
          </button>
        </div>
      )}
      {loading && !board ? (
        <LoadingState>Загрузка досок…</LoadingState>
      ) : !board ? (
        <div className="panel board-empty">
          <Users />
          <h2>Командных досок пока нет</h2>
          <p>
            {canCreate
              ? "Создайте первую доску и выдайте доступ сотрудникам."
              : "Попросите создателя доски выдать вам доступ."}
          </p>
        </div>
      ) : (
        <BoardWorkspace
          board={board}
          sensors={sensors}
          activeCard={activeCard}
          setActiveCard={setActiveCard}
          onDragEnd={(event) => void dragEnd(event)}
          type={type}
          isOwner={isOwner}
          onArchive={() => setArchiveOpen(true)}
          onLayout={(columnId) => setLayoutEditor({ columnId })}
          onAccess={() => setAccessOpen(true)}
          onRenameBoard={() => setNameEditor({ kind: "rename-board" })}
          onDeleteBoard={() => void deleteBoard()}
          onAddColumn={() => setNameEditor({ kind: "create-column" })}
          onConfigureColumn={(columnId) => setLayoutEditor({ columnId })}
          onRenameColumn={(column) =>
            setNameEditor({ kind: "rename-column", column })
          }
          onDeleteColumn={(column) => void deleteColumn(column)}
          onAddCard={(columnId) => setCardEditor({ card: null, columnId })}
          onOpenCard={(card, columnId) => setCardEditor({ card, columnId })}
        />
      )}
      <BoardPageDialogs
        board={board}
        refreshKey={refreshKey}
        archiveOpen={archiveOpen}
        setArchiveOpen={setArchiveOpen}
        setBoard={setBoard}
        loadBoard={loadBoard}
        layoutEditor={layoutEditor}
        setLayoutEditor={setLayoutEditor}
        boardDetailsMutation={boardDetailsMutation}
        cardEditor={cardEditor}
        setCardEditor={setCardEditor}
        saveCard={saveCard}
        deleteCard={deleteCard}
        nameEditor={nameEditor}
        setNameEditor={setNameEditor}
        saveName={saveName}
        accessOpen={accessOpen}
        setAccessOpen={setAccessOpen}
        accessUsers={accessUsers}
        setAccessUsers={setAccessUsers}
        accessError={accessError}
        boardMutation={boardMutation}
      />
    </section>
  );
}
