import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button, Field, Modal } from "../../../components/ui";
import { priorityLabel } from "../../requests/requestDisplay";
import type { Department, RequestType } from "../../../types";

export function TemplateEditDialog({
  editing,
  setEditing,
  departments,
  error,
  submit,
}: {
  editing: RequestType | "new" | null;
  setEditing: Dispatch<SetStateAction<RequestType | "new" | null>>;
  departments: Department[];
  error: string;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      {editing && (
        <Modal
          title={editing === "new" ? "Новый шаблон" : "Настройка шаблона"}
          close={() => setEditing(null)}
          wide
        >
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field label="Название">
                <input
                  name="name"
                  required
                  defaultValue={editing === "new" ? "" : editing.name}
                />
              </Field>
              <Field label="Отдел">
                <select
                  name="departmentId"
                  defaultValue={
                    editing === "new"
                      ? departments[0]?.id
                      : editing.departmentId
                  }
                >
                  {departments.map((department) => (
                    <option value={department.id} key={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Описание">
              <textarea
                name="description"
                defaultValue={
                  editing === "new" ? "" : (editing.description ?? "")
                }
              />
            </Field>
            <div className="form-grid">
              <Field label="Цвет">
                <input
                  name="color"
                  type="color"
                  defaultValue={
                    editing === "new" ? "#ee7d6a" : (editing.color ?? "#ee7d6a")
                  }
                />
              </Field>
              <Field label="Начальный приоритет">
                <select
                  name="defaultPriority"
                  defaultValue={
                    editing === "new" ? "NORMAL" : editing.defaultPriority
                  }
                >
                  {Object.entries(priorityLabel).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="checkbox-row">
              <label>
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={editing === "new" || editing.isActive}
                />{" "}
                Активен
              </label>
              <label>
                <input
                  name="requiresOrganization"
                  type="checkbox"
                  defaultChecked={
                    editing === "new" || editing.requiresOrganization
                  }
                />{" "}
                Требовать организацию
              </label>
              <label>
                <input
                  name="requiresStore"
                  type="checkbox"
                  defaultChecked={editing === "new" || editing.requiresStore}
                />{" "}
                Требовать точку
              </label>
              <label>
                <input
                  name="requiresComponents"
                  type="checkbox"
                  defaultChecked={
                    editing !== "new" && editing.requiresComponents
                  }
                />{" "}
                Требовать компоненты
              </label>
              <label>
                <input
                  name="availableOnWeb"
                  type="checkbox"
                  defaultChecked={editing === "new" || editing.availableOnWeb}
                />{" "}
                Сайт
              </label>
              <label>
                <input
                  name="availableOnTelegram"
                  type="checkbox"
                  defaultChecked={
                    editing === "new" || editing.availableOnTelegram
                  }
                />{" "}
                Telegram
              </label>
            </div>
            <Field label="Дополнительные поля (JSON)">
              <textarea
                name="templateFields"
                rows={7}
                defaultValue={
                  editing === "new"
                    ? "[]"
                    : JSON.stringify(editing.templateFields ?? [], null, 2)
                }
              />
              <small>
                Пример: [
                {
                  '{"key":"serial","label":"Серийный номер","type":"TEXT","required":true}'
                }
                ]
              </small>
            </Field>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <Button
                kind="secondary"
                type="button"
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
