import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button, Field, Modal } from "../../components/ui";
import { roleLabel } from "../../auth/permissions";
import { StaffPermissionEditor } from "./StaffPermissionEditor";
import type { Department, StaffMember } from "../../types";

export function StaffAccessDialog({
  editing,
  setEditing,
  departments,
  submit,
  error,
  createTelegramLink,
  telegramLink,
}: {
  editing: StaffMember | "new" | null;
  setEditing: Dispatch<SetStateAction<StaffMember | "new" | null>>;
  departments: Department[];
  submit: (event: FormEvent<HTMLFormElement>) => void;
  error: string;
  createTelegramLink: (id: number) => void;
  telegramLink: { deepLink: string; expiresAt: string } | null;
}) {
  return (
    <>
      {editing && (
        <Modal
          title={
            editing === "new" ? "Новый сотрудник" : `Права: ${editing.ipName}`
          }
          close={() => setEditing(null)}
          wide
        >
          <form onSubmit={submit}>
            {editing === "new" && (
              <>
                <div className="form-grid">
                  <Field label="Имя">
                    <input name="name" required />
                  </Field>
                  <Field label="Телефон">
                    <input name="phone" required />
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="Email">
                    <input name="email" type="email" required />
                  </Field>
                  <Field label="Временный пароль">
                    <input name="password" minLength={8} required />
                  </Field>
                </div>
              </>
            )}
            <Field label="Роль">
              <select
                name="role"
                defaultValue={editing === "new" ? "MASTER" : editing.role}
              >
                {(["DIRECTOR", "DEPARTMENT_HEAD", "MASTER"] as const).map(
                  (role) => (
                    <option value={role} key={role}>
                      {roleLabel[role]}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <section className="staff-access-editor">
              <section className="access-group departments-group">
                <div className="access-group-head">
                  <div>
                    <h3>Отделы</h3>
                    <p>Определяют рабочую очередь сотрудника.</p>
                  </div>
                </div>
                <div className="access-list">
                  {departments.map((department) => (
                    <label className="access-row" key={department.id}>
                      <input
                        name="departments"
                        type="checkbox"
                        value={department.id}
                        defaultChecked={
                          editing !== "new" &&
                          editing.departmentMemberships.some(
                            (item) => item.departmentId === department.id,
                          )
                        }
                      />
                      <span>
                        <b>{department.name}</b>
                        <small>
                          {department.isActive
                            ? "Активный отдел"
                            : "Отдел отключён"}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
              <StaffPermissionEditor editing={editing} />
            </section>
            {editing !== "new" && (
              <section className="telegram-link">
                <div>
                  <b>Рабочий Telegram</b>
                  <p>
                    {editing.linkedTelegramChats?.[0] ? (
                      <>
                        Подключён: @
                        {editing.linkedTelegramChats[0].username ??
                          editing.linkedTelegramChats[0].title}
                      </>
                    ) : (
                      "Не подключён"
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  kind="secondary"
                  onClick={() => void createTelegramLink(editing.id)}
                >
                  {editing.linkedTelegramChats?.length
                    ? "Новая ссылка"
                    : "Подключить Telegram"}
                </Button>
                {telegramLink && (
                  <a
                    className="link-button"
                    href={telegramLink.deepLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Открыть ссылку (20 мин.)
                  </a>
                )}
              </section>
            )}
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <Button
                type="button"
                kind="secondary"
                onClick={() => setEditing(null)}
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
