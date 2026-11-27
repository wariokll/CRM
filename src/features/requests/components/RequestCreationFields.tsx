import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Field } from "../../../components/ui";
import { roleLabel } from "../../../auth/permissions";
import type {
  Organization,
  RequestType,
  StaffMember,
  Store,
  User,
} from "../../../types";

export function RequestCreationFields({
  types,
  type,
  typeId,
  setTypeId,
  activeOrganizations,
  organizationId,
  setOrganizationId,
  visibleStores,
  canSelectAssignee,
  user,
  assignees,
  assigneeId,
  setAssigneeId,
  urgency,
  setUrgency,
  scheduledValue,
  recurrenceIntervalDays,
  setRecurrenceIntervalDays,
  dynamic,
}: {
  types: RequestType[];
  type: RequestType | undefined;
  typeId: number;
  setTypeId: Dispatch<SetStateAction<number>>;
  activeOrganizations: Organization[];
  organizationId: number;
  setOrganizationId: Dispatch<SetStateAction<number>>;
  visibleStores: Store[];
  canSelectAssignee: boolean;
  user: User;
  assignees: StaffMember[];
  assigneeId: string;
  setAssigneeId: Dispatch<SetStateAction<string>>;
  urgency: "URGENT" | "SCHEDULED";
  setUrgency: Dispatch<SetStateAction<"URGENT" | "SCHEDULED">>;
  scheduledValue?: string;
  recurrenceIntervalDays: string;
  setRecurrenceIntervalDays: Dispatch<SetStateAction<string>>;
  dynamic: (
    field: NonNullable<RequestType["templateFields"]>[number],
  ) => ReactNode;
}) {
  return (
    <>
      <Field label="Шаблон">
        <select
          value={typeId}
          onChange={(e) => setTypeId(Number(e.target.value))}
        >
          {types
            .filter((t) => t.isActive)
            .map((t) => (
              <option value={t.id} key={t.id}>
                {t.name} · {t.department.name}
              </option>
            ))}
        </select>
      </Field>
      {type?.requiresOrganization && (
        <Field label="Организация">
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(Number(e.target.value))}
            required
            disabled={!activeOrganizations.length}
          >
            <option value="">
              {activeOrganizations.length
                ? "Выберите организацию"
                : "Нет доступных активных организаций"}
            </option>
            {activeOrganizations.map((o) => (
              <option value={o.id} key={o.id}>
                {o.legalName}
              </option>
            ))}
          </select>
        </Field>
      )}
      {type?.requiresStore && (
        <Field label="Торговая точка">
          <select name="storeId" required>
            <option value="">Выберите точку</option>
            {visibleStores.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name} — {s.address}
              </option>
            ))}
          </select>
        </Field>
      )}
      {canSelectAssignee && (
        <Field label="Исполнитель (необязательно)">
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            <option value="">Не назначать при создании</option>
            {user.role === "MASTER" ? (
              <option value={user.id}>{user.ipName} · я</option>
            ) : (
              assignees.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.ipName} · {roleLabel[person.role]}
                </option>
              ))
            )}
          </select>
        </Field>
      )}
      <div className="segmented">
        <button
          type="button"
          className={urgency === "URGENT" ? "active" : ""}
          onClick={() => setUrgency("URGENT")}
        >
          Срочная
        </button>
        <button
          type="button"
          className={urgency === "SCHEDULED" ? "active" : ""}
          onClick={() => setUrgency("SCHEDULED")}
        >
          Плановая
        </button>
      </div>
      {urgency === "SCHEDULED" && (
        <>
          <Field label="Дата и время">
            <input
              name="scheduledAt"
              type="datetime-local"
              min={new Date(Date.now() + 300000).toISOString().slice(0, 16)}
              defaultValue={scheduledValue}
              required
            />
          </Field>
          {canSelectAssignee && (
            <Field label="Повторять (необязательно)">
              <div className="input-with-suffix">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={recurrenceIntervalDays}
                  onChange={(event) =>
                    setRecurrenceIntervalDays(event.target.value)
                  }
                  placeholder="Например, 365"
                />
                <span>дней</span>
              </div>
              <small>
                Будущие заявки создаются автоматически. Выходные и федеральные
                праздники переносятся на предыдущий рабочий день.
              </small>
            </Field>
          )}
        </>
      )}
      {type?.templateFields?.map(dynamic)}
      <Field label="Описание">
        <textarea name="description" rows={4} minLength={5} required />
      </Field>
    </>
  );
}
