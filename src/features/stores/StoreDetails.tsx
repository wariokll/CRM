import { useEffect, useState, type FormEvent } from "react";
import { can } from "../../auth/permissions";
import { Button, Field, Modal } from "../../components/ui";
import { StoreAccessLinks } from "./StoreAccessLinks";
import type { Store, StoreAccess, User } from "../../types";

function errorText(reason: unknown) {
  return reason instanceof Error ? reason.message : "Request failed";
}

export function StoreDetails({
  store,
  user,
  close,
  loadAccess,
  saveAccessRequest,
}: {
  store: Store;
  user: User;
  close: () => void;
  loadAccess: (storeId: number) => Promise<StoreAccess | null>;
  saveAccessRequest: (
    storeId: number,
    values: Record<string, string>,
  ) => Promise<void>;
}) {
  const canViewSecrets = can(user, "VIEW_STORE_SECRETS"),
    canEditAccess = user.role !== "CLIENT";
  const [access, setAccess] = useState<StoreAccess | null>(null),
    [loading, setLoading] = useState(canViewSecrets),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!canViewSecrets) return;
    loadAccess(store.id)
      .then(setAccess)
      .catch((reason) => setError(errorText(reason)))
      .finally(() => setLoading(false));
  }, [store.id, canViewSecrets, loadAccess]);
  const details = access ?? store.access;
  const saveAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const values = Object.fromEntries(
      Array.from(new FormData(event.currentTarget).entries()).filter(
        ([, value]) => typeof value === "string" && value.trim(),
      ),
    ) as Record<string, string>;
    try {
      await saveAccessRequest(store.id, values);
      setAccess(
        (previous) => ({ ...(previous ?? {}), ...values }) as StoreAccess,
      );
      setSaved(true);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={store.name} close={close} wide>
      <div className="detail-grid">
        <div>
          <small>Организация</small>
          <b>{store.organization?.legalName ?? "Не указана"}</b>
        </div>
        <div>
          <small>Статус</small>
          <b>
            {store.status === "ACTIVE"
              ? "Активна"
              : store.status === "PENDING"
                ? "На модерации"
                : "Отклонена"}
          </b>
        </div>
        <div>
          <small>Заявок</small>
          <b>{store._count?.requests ?? 0}</b>
        </div>
        <div>
          <small>Адрес</small>
          <b>{store.address}</b>
        </div>
        <div>
          <small>Телефон</small>
          <b>{store.phone || "Не указан"}</b>
        </div>
        <div>
          <small>Контакт</small>
          <b>
            {store.user?.ipName ??
              store.organization?.contactName ??
              "Не указан"}
          </b>
        </div>
      </div>
      <section className="store-access">
        <h3>Рабочие доступы</h3>
        {loading ? (
          <p>Загрузка доступов…</p>
        ) : (
          <>
            <div className="detail-grid">
              <div>
                <small>AnyDesk</small>
                <b>{details?.anydeskId || "Не указан"}</b>
              </div>
              <div>
                <small>ОФД</small>
                <b>{details?.ofdUrl || "Не указан"}</b>
                <span>{details?.ofdLogin || ""}</span>
              </div>
              <div>
                <small>Налоговая</small>
                <b>{details?.nalogUrl || "Не указан"}</b>
                <span>{details?.nalogLogin || ""}</span>
              </div>
            </div>
            <StoreAccessLinks access={details} />
          </>
        )}
        {canEditAccess && (
          <form className="access-form" onSubmit={saveAccess}>
            <h3>Заполнить или обновить доступы</h3>
            <p>
              Пустое поле не изменяет сохранённое значение. Пароли видят только
              сотрудники с отдельным разрешением.
            </p>
            <div className="form-grid">
              <Field label="AnyDesk ID">
                <input
                  name="anydeskId"
                  defaultValue={details?.anydeskId ?? ""}
                />
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
                <input
                  name="nalogLogin"
                  defaultValue={details?.nalogLogin ?? ""}
                />
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
        )}
      </section>
    </Modal>
  );
}
