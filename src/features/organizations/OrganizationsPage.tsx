import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { ApiError } from "../../api";
import { Button, Empty, Field, Modal } from "../../components/ui";
import { OrganizationCards } from "./OrganizationCards";
import { useOrganizationMutation } from "./queries";
import type { Organization, User } from "../../types";

function errorText(reason: unknown) {
  return reason instanceof ApiError || reason instanceof Error
    ? reason.message
    : "Request failed";
}

export function OrganizationsPage({
  organizations,
  user,
  reload,
  openStores,
}: {
  organizations: Organization[];
  user: User;
  reload: () => void;
  openStores: (organizationId: number) => void;
}) {
  const [adding, setAdding] = useState(false),
    [error, setError] = useState(""),
    [deletingId, setDeletingId] = useState<number | null>(null),
    [contacts, setContacts] = useState([{ fullName: "", phone: "", note: "" }]);
  const organizationMutation = useOrganizationMutation();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await organizationMutation.mutateAsync({
        path: "/organizations",
        init: {
          method: "POST",
          body: JSON.stringify({
            ...values,
            contacts: contacts.filter((contact) => contact.fullName.trim()),
          }),
        },
      });
      setAdding(false);
      setContacts([{ fullName: "", phone: "", note: "" }]);
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const approve = async (id: number) => {
    try {
      setError("");
      await organizationMutation.mutateAsync({
        path: "/organizations/" + id + "/approve",
        init: { method: "POST" },
      });
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const reject = async (id: number) => {
    const rejectionReason = window.prompt(
      "Укажите причину отказа (её увидит клиент):",
    );
    if (!rejectionReason?.trim()) return;
    try {
      setError("");
      await organizationMutation.mutateAsync({
        path: "/organizations/" + id + "/reject",
        init: { method: "POST", body: JSON.stringify({ rejectionReason }) },
      });
      reload();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const remove = async (organization: Organization) => {
    const storesCount = organization.stores?.length ?? 0;
    if (
      !window.confirm(
        `Удалить организацию «${organization.legalName}»? Будут удалены связанные точки (${storesCount}), а заявки сохранятся без связи с организацией и точками.`,
      )
    )
      return;
    try {
      setError("");
      setDeletingId(organization.id);
      await organizationMutation.mutateAsync({
        path: `/organizations/${organization.id}`,
        init: { method: "DELETE" },
      });
      reload();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setDeletingId(null);
    }
  };
  const canApprove = user.role !== "CLIENT";
  return (
    <>
      <div className="section-actions">
        <span>{organizations.length} организаций</span>
        <Button onClick={() => setAdding(true)}>
          <Plus /> Добавить организацию
        </Button>
      </div>
      {error && <div className="page-error">{error}</div>}
      <OrganizationCards
        organizations={organizations}
        user={user}
        canApprove={canApprove}
        openStores={openStores}
        approve={approve}
        reject={reject}
        remove={remove}
        deletingId={deletingId}
      />
      {!organizations.length && (
        <Empty
          title="Организаций нет"
          text="Добавьте первую организацию, чтобы связать с ней точки и заявки."
        />
      )}
      {adding && (
        <Modal title="Новая организация" close={() => setAdding(false)}>
          <form onSubmit={submit}>
            <Field label="Тип">
              <select name="type">
                <option value="IP">ИП</option>
                <option value="OOO">ООО</option>
                <option value="OTHER">Другое</option>
              </select>
            </Field>
            <Field label="Полное название">
              <input name="legalName" minLength={2} required />
            </Field>
            <Field label="Сокращённое название">
              <input name="shortName" />
            </Field>
            <div className="form-grid">
              <Field label="ИНН">
                <input name="inn" />
              </Field>
              <Field label="КПП">
                <input name="kpp" />
              </Field>
            </div>
            <Field label="ОГРН / ОГРНИП">
              <input name="ogrn" />
            </Field>
            <Field label="Юридический адрес">
              <textarea name="legalAddress" />
            </Field>
            <Field label="Основной телефон организации">
              <input name="phone" />
            </Field>
            <Field label="Email">
              <input name="email" type="email" />
            </Field>
            <section className="contact-editor">
              <h3>Контактные лица</h3>
              {contacts.map((contact, index) => (
                <div className="contact-row" key={index}>
                  <input
                    value={contact.fullName}
                    onChange={(event) =>
                      setContacts((items) =>
                        items.map((item, position) =>
                          position === index
                            ? { ...item, fullName: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="ФИО"
                  />
                  <input
                    value={contact.phone}
                    onChange={(event) =>
                      setContacts((items) =>
                        items.map((item, position) =>
                          position === index
                            ? { ...item, phone: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Телефон"
                  />
                  <input
                    value={contact.note}
                    onChange={(event) =>
                      setContacts((items) =>
                        items.map((item, position) =>
                          position === index
                            ? { ...item, note: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Примечание"
                  />
                  {contacts.length > 1 && (
                    <Button
                      kind="ghost"
                      type="button"
                      onClick={() =>
                        setContacts((items) =>
                          items.filter((_, position) => position !== index),
                        )
                      }
                    >
                      Удалить
                    </Button>
                  )}
                </div>
              ))}
              <Button
                kind="secondary"
                type="button"
                onClick={() =>
                  setContacts((items) => [
                    ...items,
                    { fullName: "", phone: "", note: "" },
                  ])
                }
              >
                + Ещё контакт
              </Button>
            </section>
            <div className="modal-actions">
              <Button
                type="button"
                kind="secondary"
                onClick={() => setAdding(false)}
              >
                Отмена
              </Button>
              <Button>Сохранить</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
