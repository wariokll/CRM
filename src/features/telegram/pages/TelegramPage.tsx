import { useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { ApiError } from "../../../api";
import { Button, Empty, Field } from "../../../components/ui";
import { formatDate } from "../../../shared/formatDate";
import { useSaveTelegramLinksMutation } from "../queries";
import type {
  Organization,
  Store,
  TelegramChat,
  TelegramIntegration,
} from "../../../types";

function errorText(reason: unknown) {
  return reason instanceof ApiError || reason instanceof Error
    ? reason.message
    : "Request failed";
}

export function TelegramPage({
  integrations,
  chats,
  organizations,
  stores,
  reload,
}: {
  integrations: TelegramIntegration[];
  chats: TelegramChat[];
  organizations: Organization[];
  stores: Store[];
  reload: () => void;
}) {
  const [editing, setEditing] = useState<number | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const saveTelegramLinksMutation = useSaveTelegramLinksMutation();
  const saveLinks = async (
    event: FormEvent<HTMLFormElement>,
    chatId: number,
  ) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await saveTelegramLinksMutation.mutateAsync({
        chatId,
        organizationIds: form.getAll("organizationIds").map(Number),
        storeIds: form.getAll("storeIds").map(Number),
      });
      setEditing(null);
      await reload();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="stats-grid">
        {integrations.map((item) => (
          <div className="stat-card violet" key={item.id}>
            <span>
              <MessageCircle />
            </span>
            <div>
              <small>
                {item.kind === "BOT" ? "Telegram-бот" : "Корпоративный аккаунт"}
              </small>
              <strong style={{ fontSize: 15 }}>
                {item.status === "ACTIVE" ? "Подключён" : "Нужна настройка"}
              </strong>
            </div>
          </div>
        ))}
      </div>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Telegram-аккаунты и привязки</h2>
            <p>
              Один аккаунт можно связать с несколькими организациями и точками.
              Для привязки пользователь должен сначала написать боту.
            </p>
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        {chats.length ? (
          chats.map((chat) => {
            const organizationIds = chat.organizationLinks.map(
                (link) => link.organization.id,
              ),
              storeIds = chat.storeLinks.map((link) => link.store.id);
            return (
              <article className="telegram-row" key={chat.id}>
                <div>
                  <b>{chat.title}</b>
                  <span>
                    {chat.username ? "@" + chat.username : "Без username"}
                  </span>
                  <small>
                    {chat.messages[0]?.body ?? "Нет сообщений"} ·{" "}
                    {formatDate(chat.lastMessageAt)}
                  </small>
                  <p className="telegram-links-summary">
                    Организации:{" "}
                    {chat.organizationLinks.length
                      ? chat.organizationLinks
                          .map((link) => link.organization.legalName)
                          .join(", ")
                      : "не привязаны"}
                    <br />
                    Точки:{" "}
                    {chat.storeLinks.length
                      ? chat.storeLinks
                          .map((link) => link.store.name)
                          .join(", ")
                      : "не привязаны"}
                  </p>
                </div>
                <Button
                  kind="secondary"
                  onClick={() => {
                    setEditing(editing === chat.id ? null : chat.id);
                    setError("");
                  }}
                >
                  {editing === chat.id ? "Скрыть" : "Настроить привязки"}
                </Button>
                {editing === chat.id && (
                  <form
                    className="telegram-links-form"
                    onSubmit={(event) => void saveLinks(event, chat.id)}
                  >
                    <Field label="Организации">
                      <select
                        name="organizationIds"
                        multiple
                        defaultValue={organizationIds.map(String)}
                      >
                        {organizations
                          .filter((item) => item.status === "ACTIVE")
                          .map((item) => (
                            <option value={item.id} key={item.id}>
                              {item.legalName}
                            </option>
                          ))}
                      </select>
                      <small>Ctrl / Cmd + клик — выбрать несколько.</small>
                    </Field>
                    <Field label="Торговые точки">
                      <select
                        name="storeIds"
                        multiple
                        defaultValue={storeIds.map(String)}
                      >
                        {stores
                          .filter((item) => item.status === "ACTIVE")
                          .map((item) => (
                            <option value={item.id} key={item.id}>
                              {item.organization?.legalName
                                ? item.organization.legalName + " · "
                                : ""}
                              {item.name} — {item.address}
                            </option>
                          ))}
                      </select>
                      <small>
                        Привязка точки имеет приоритет при создании заявки
                        ботом.
                      </small>
                    </Field>
                    <div className="modal-actions">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Сохранение…" : "Сохранить привязки"}
                      </Button>
                    </div>
                  </form>
                )}
              </article>
            );
          })
        ) : (
          <Empty
            title="Telegram ещё не подключён"
            text="Попросите пользователя написать боту: после первого сообщения аккаунт появится в этом списке."
          />
        )}
      </section>
    </>
  );
}
