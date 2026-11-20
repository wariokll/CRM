import { useState, type FormEvent } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog, errorText } from "./BoardDialog";
import type { BoardCard } from "../../types";

export function CardDialog({
  card,
  close,
  save,
  remove,
}: {
  card: BoardCard | null;
  close: () => void;
  save: (data: {
    title: string;
    description: string;
    deadline: string | null;
  }) => Promise<void>;
  remove?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(
      new FormData(event.currentTarget),
    ) as Record<string, string>;
    try {
      await save({
        title: values.title ?? "",
        description: values.description ?? "",
        deadline: values.deadline || null,
      });
      close();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const deleteCard = async () => {
    if (!remove || !window.confirm("Удалить карточку?")) return;
    setBusy(true);
    setError("");
    try {
      await remove();
      close();
    } catch (reason) {
      setError(errorText(reason));
      setBusy(false);
    }
  };
  return (
    <Dialog title={card ? "Карточка" : "Новая карточка"} close={close}>
      <form onSubmit={submit}>
        <label className="field">
          <span>Название</span>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={card?.title ?? ""}
            autoFocus
          />
        </label>
        <label className="field">
          <span>Срок</span>
          <input
            name="deadline"
            type="date"
            defaultValue={card?.deadline?.slice(0, 10) ?? ""}
          />
        </label>
        <label className="field">
          <span>Описание</span>
          <textarea
            name="description"
            rows={7}
            maxLength={5000}
            defaultValue={card?.description ?? ""}
          />
        </label>
        {error && (
          <div className="form-error">
            <AlertTriangle />
            {error}
          </div>
        )}
        <div className="modal-actions">
          {remove && (
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => void deleteCard()}
            >
              <Trash2 /> Удалить
            </button>
          )}
          <button type="button" className="button secondary" onClick={close}>
            Отмена
          </button>
          <button className="button" disabled={busy}>
            {card ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function NameDialog({
  title,
  label,
  initialValue = "",
  close,
  save,
}: {
  title: string;
  label: string;
  initialValue?: string;
  close: () => void;
  save: (name: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const name = String(
      new FormData(event.currentTarget).get("name") ?? "",
    ).trim();
    try {
      await save(name);
      close();
    } catch (reason) {
      setError(errorText(reason));
      setBusy(false);
    }
  };
  return (
    <Dialog title={title} close={close}>
      <form onSubmit={submit}>
        <label className="field">
          <span>{label}</span>
          <input
            name="name"
            required
            minLength={1}
            maxLength={120}
            defaultValue={initialValue}
            autoFocus
          />
        </label>
        {error && (
          <div className="form-error">
            <AlertTriangle />
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={close}>
            Отмена
          </button>
          <button className="button" disabled={busy}>
            Сохранить
          </button>
        </div>
      </form>
    </Dialog>
  );
}
