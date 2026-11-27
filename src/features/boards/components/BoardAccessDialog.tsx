import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, LockKeyhole, Search } from "lucide-react";
import { Dialog, errorText } from "./BoardDialog";
import type { BoardAccessUser } from "../../../types";

export function AccessDialog({
  users,
  loadError,
  updateAccess,
  close,
}: {
  users: BoardAccessUser[];
  loadError: string;
  updateAccess: (user: BoardAccessUser) => Promise<void>;
  close: () => void;
}) {
  const [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [busyId, setBusyId] = useState<number | null>(null);
  useEffect(() => {
    setError(loadError);
  }, [loadError]);
  const visible = useMemo(
    () =>
      users.filter((user) =>
        `${user.ipName} ${user.email}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [users, search],
  );
  const toggle = async (user: BoardAccessUser) => {
    if (user.isOwner) return;
    setBusyId(user.id);
    setError("");
    try {
      await updateAccess(user);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusyId(null);
    }
  };
  return (
    <Dialog title="Доступ к доске" close={close} wide>
      <div className="board-access-search">
        <Search />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск сотрудника"
        />
      </div>
      {error && (
        <div className="form-error">
          <AlertTriangle />
          {error}
        </div>
      )}
      <div className="board-access-list">
        {visible.map((user) => (
          <div key={user.id}>
            <span className="avatar">
              {user.ipName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <b>{user.ipName}</b>
              <small>{user.email}</small>
            </div>
            {user.isOwner ? (
              <span className="owner-badge">
                <LockKeyhole /> Создатель
              </span>
            ) : (
              <button
                disabled={busyId === user.id}
                className={`button compact ${user.hasAccess ? "secondary" : ""}`}
                onClick={() => void toggle(user)}
              >
                {user.hasAccess ? "Убрать доступ" : "Выдать доступ"}
              </button>
            )}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
