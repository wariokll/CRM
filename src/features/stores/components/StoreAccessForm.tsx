import type { FormEvent } from "react";
import { Button, Field } from "../../../components/ui";
import type { StoreAccess } from "../../../types";

type StoreAccessFormProps = {
  details: StoreAccess | null | undefined;
  access: StoreAccess | null;
  canViewSecrets: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function StoreAccessForm({
  details,
  access,
  canViewSecrets,
  saving,
  saved,
  error,
  onSubmit,
}: StoreAccessFormProps) {
  return (
    <form className="access-form" onSubmit={onSubmit}>
      <h3>Заполнить или обновить доступы</h3>
      <p>
        Пустое поле не изменяет сохранённое значение. Пароли видят только
        сотрудники с отдельным разрешением.
      </p>
      <div className="form-grid">
        <Field label="AnyDesk ID">
          <input name="anydeskId" defaultValue={details?.anydeskId ?? ""} />
        </Field>
        <Field label="Пароль AnyDesk">
          <input
            name="anydeskPassword"
            type="password"
            placeholder={
              canViewSecrets && access?.anydeskPassword
                ? "Сохранён — введите для замены"
                : "Введите пароль"
            }
          />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Сайт ОФД">
          <input
            name="ofdUrl"
            type="url"
            placeholder="https://…"
            defaultValue={details?.ofdUrl ?? ""}
          />
        </Field>
        <Field label="Логин ОФД">
          <input name="ofdLogin" defaultValue={details?.ofdLogin ?? ""} />
        </Field>
      </div>
      <Field label="Пароль ОФД">
        <input
          name="ofdPassword"
          type="password"
          placeholder={
            canViewSecrets && access?.ofdPassword
              ? "Сохранён — введите для замены"
              : "Введите пароль"
          }
        />
      </Field>
      <div className="form-grid">
        <Field label="Сайт налоговой">
          <input
            name="nalogUrl"
            type="url"
            placeholder="https://…"
            defaultValue={details?.nalogUrl ?? ""}
          />
        </Field>
        <Field label="Логин налоговой">
          <input name="nalogLogin" defaultValue={details?.nalogLogin ?? ""} />
        </Field>
      </div>
      <Field label="Пароль налоговой">
        <input
          name="nalogPassword"
          type="password"
          placeholder={
            canViewSecrets && access?.nalogPassword
              ? "Сохранён — введите для замены"
              : "Введите пароль"
          }
        />
      </Field>
      {error && <div className="form-error">{error}</div>}
      {saved && <div className="inline-message">Доступы сохранены.</div>}
      <div className="modal-actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить доступы"}
        </Button>
      </div>
    </form>
  );
}
