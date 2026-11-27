import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  Button,
  Empty,
  ErrorState,
  Field,
  Modal,
} from "../../../components/ui";
import { OrganizationCards } from "../components/OrganizationCards";
import { useOrganizationActions } from "../hooks/useOrganizationActions";
import type { Organization, User } from "../../../types";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const adding = searchParams.get("organizationDialog") === "new";
  const setAdding = (open: boolean) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (open) next.set("organizationDialog", "new");
      else next.delete("organizationDialog");
      return next;
    });
  };
  const {
    error,
    deletingId,
    contacts,
    setContacts,
    submit,
    approve,
    reject,
    remove,
  } = useOrganizationActions(setAdding, reload);
  const canApprove = user.role !== "CLIENT";
  return (
    <>
      <div className="section-actions">
        <span>{organizations.length} организаций</span>
        <Button onClick={() => setAdding(true)}>
          <Plus /> Добавить организацию
        </Button>
      </div>
      {error && <ErrorState>{error}</ErrorState>}
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
