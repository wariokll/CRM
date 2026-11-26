import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../api";
import { Button, Field, Modal } from "../../components/ui";
import { RequestComponents } from "./RequestComponents";
import { RequestCreationFields } from "./RequestCreationFields";
import type {
  Component,
  Organization,
  RequestType,
  StaffMember,
  Store,
  User,
} from "../../types";
import {
  getRequestAssignees,
  getRequestComponents,
  useRequestMutation,
} from "./queries";

function errorText(reason: unknown) {
  return reason instanceof ApiError || reason instanceof Error
    ? reason.message
    : "Request failed";
}

export function CreateRequestForm({
  organizations,
  stores,
  types,
  user,
  close,
  reload,
  initialUrgency = "URGENT",
  initialScheduledAt,
}: {
  organizations: Organization[];
  stores: Store[];
  types: RequestType[];
  user: User;
  close: () => void;
  reload: () => void;
  initialUrgency?: "URGENT" | "SCHEDULED";
  initialScheduledAt?: Date | null;
}) {
  const activeOrganizations = organizations.filter(
    (organization) => organization.status === "ACTIVE",
  );
  const [typeId, setTypeId] = useState(types.find((t) => t.isActive)?.id ?? 0),
    [organizationId, setOrganizationId] = useState(
      activeOrganizations[0]?.id ?? 0,
    ),
    [urgency, setUrgency] = useState<"URGENT" | "SCHEDULED">(initialUrgency),
    [assigneeId, setAssigneeId] = useState(""),
    [assignees, setAssignees] = useState<StaffMember[]>([]),
    [components, setComponents] = useState<Component[]>([]),
    [selectedComponents, setSelectedComponents] = useState<
      Array<{ componentId: number; quantity: number }>
    >([]),
    [recurrenceIntervalDays, setRecurrenceIntervalDays] = useState(""),
    [error, setError] = useState("");
  const selectedType = types.find((t) => t.id === typeId);
  const requestMutation = useRequestMutation();
  const type = selectedType?.requiresComponents
    ? {
        ...selectedType,
        templateFields: [
          ...(selectedType.templateFields ?? []),
          {
            key: "__components",
            label: "",
            type: "TEXT" as const,
            required: false,
          },
        ],
      }
    : selectedType;
  const visibleStores = stores.filter(
    (store) =>
      store.organizationId === organizationId && store.status === "ACTIVE",
  );
  const canSelectAssignee = user.role !== "CLIENT";
  useEffect(() => {
    if (
      !activeOrganizations.some(
        (organization) => organization.id === organizationId,
      )
    )
      setOrganizationId(activeOrganizations[0]?.id ?? 0);
  }, [organizationId, activeOrganizations]);
  useEffect(() => {
    if (!canSelectAssignee || user.role === "MASTER") return;
    getRequestAssignees()
      .then(setAssignees)
      .catch(() => setAssignees([]));
  }, [canSelectAssignee, user.role]);
  useEffect(() => {
    getRequestComponents()
      .then(setComponents)
      .catch(() => setComponents([]));
  }, []);
  const scheduledValue = initialScheduledAt
    ? new Date(
        initialScheduledAt.getTime() -
          initialScheduledAt.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : undefined;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(
      new FormData(event.currentTarget),
    ) as Record<string, string>;
    const templateData: Record<string, unknown> = {};
    type?.templateFields?.forEach((field) => {
      if (field.type === "CHECKBOX")
        templateData[field.key] = values[field.key] === "on";
      else if (values[field.key]) templateData[field.key] = values[field.key];
    });
    try {
      await requestMutation.mutateAsync({
        path: "/requests",
        init: {
          method: "POST",
          body: JSON.stringify({
            typeId,
            organizationId: type?.requiresOrganization
              ? organizationId
              : undefined,
            storeId: type?.requiresStore ? Number(values.storeId) : undefined,
            urgency,
            scheduledAt:
              urgency === "SCHEDULED" ? values.scheduledAt : undefined,
            recurrenceIntervalDays:
              urgency === "SCHEDULED" && recurrenceIntervalDays
                ? Number(recurrenceIntervalDays)
                : undefined,
            assigneeId: assigneeId ? Number(assigneeId) : undefined,
            components: selectedComponents,
            description: values.description,
            templateData,
          }),
        },
      });
      reload();
      close();
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  const dynamic = (
    field: NonNullable<RequestType["templateFields"]>[number],
  ) =>
    field.key === "__components" ? (
      <RequestComponents
        key={field.key}
        components={components}
        selected={selectedComponents}
        onChange={setSelectedComponents}
      />
    ) : (
      <Field
        label={`${field.label}${field.required ? " *" : ""}`}
        key={field.key}
      >
        {field.type === "TEXTAREA" ? (
          <textarea name={field.key} required={field.required} />
        ) : field.type === "SELECT" ? (
          <select name={field.key} required={field.required}>
            <option value="">Выберите</option>
            {field.options?.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : field.type === "CHECKBOX" ? (
          <input name={field.key} type="checkbox" />
        ) : (
          <input
            name={field.key}
            type={
              field.type === "DATE"
                ? "date"
                : field.type === "NUMBER"
                  ? "number"
                  : field.type === "FILE"
                    ? "file"
                    : "text"
            }
            required={field.required}
          />
        )}
      </Field>
    );
  return (
    <Modal title="Новая заявка" close={close}>
      <form onSubmit={submit}>
        <RequestCreationFields
          types={types}
          type={type}
          typeId={typeId}
          setTypeId={setTypeId}
          activeOrganizations={activeOrganizations}
          organizationId={organizationId}
          setOrganizationId={setOrganizationId}
          visibleStores={visibleStores}
          canSelectAssignee={canSelectAssignee}
          user={user}
          assignees={assignees}
          assigneeId={assigneeId}
          setAssigneeId={setAssigneeId}
          urgency={urgency}
          setUrgency={setUrgency}
          scheduledValue={scheduledValue}
          recurrenceIntervalDays={recurrenceIntervalDays}
          setRecurrenceIntervalDays={setRecurrenceIntervalDays}
          dynamic={dynamic}
        />
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <Button kind="secondary" type="button" onClick={close}>
            Отмена
          </Button>
          <Button
            disabled={type?.requiresOrganization && !activeOrganizations.length}
          >
            Создать заявку
          </Button>
        </div>
      </form>
    </Modal>
  );
}
