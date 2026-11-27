import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { ApiError } from "../../../api";
import { Button } from "../../../components/ui";
import { priorityLabel } from "../../requests/requestDisplay";
import { TemplateEditDialog } from "../components/TemplateEditDialog";
import type { Component, Department, RequestType } from "../../../types";
import {
  getComponents,
  useCreateComponentMutation,
  useSaveRequestTypeMutation,
} from "../queries";

function errorText(reason: unknown) {
  return reason instanceof ApiError || reason instanceof Error
    ? reason.message
    : "Request failed";
}

export function TemplatesPage({
  types,
  departments,
  reload,
}: {
  types: RequestType[];
  departments: Department[];
  reload: () => void;
}) {
  const [editing, setEditing] = useState<RequestType | "new" | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [error, setError] = useState("");
  const saveRequestTypeMutation = useSaveRequestTypeMutation();
  const createComponentMutation = useCreateComponentMutation();
  const loadComponents = useCallback(
    () =>
      getComponents()
        .then(setComponents)
        .catch(() => setComponents([])),
    [],
  );
  useEffect(() => {
    void loadComponents();
  }, [loadComponents]);
  const open = (template: RequestType | "new") => {
    setEditing(template);
    setError("");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const values = Object.fromEntries(
      new FormData(event.currentTarget),
    ) as Record<string, string>;
    try {
      const templateFields = values.templateFields
        ? JSON.parse(values.templateFields)
        : [];
      await saveRequestTypeMutation.mutateAsync({
        id: editing === "new" ? null : (editing as RequestType).id,
        body: {
          ...values,
          departmentId: Number(values.departmentId),
          isActive: values.isActive === "on",
          requiresOrganization: values.requiresOrganization === "on",
          requiresStore: values.requiresStore === "on",
          requiresComponents: values.requiresComponents === "on",
          availableOnWeb: values.availableOnWeb === "on",
          availableOnTelegram: values.availableOnTelegram === "on",
          templateFields,
        },
      });
      setEditing(null);
      reload();
    } catch (reason) {
      setError(
        reason instanceof SyntaxError
          ? "Дополнительные поля указаны в неверном формате JSON"
          : errorText(reason),
      );
    }
  };
  const addCatalogComponent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("componentName") ?? "").trim();
    if (!name) return;
    try {
      const component = await createComponentMutation.mutateAsync(name);
      form.reset();
      setComponents((items) =>
        [...items, component].sort((left, right) =>
          left.name.localeCompare(right.name, "ru"),
        ),
      );
    } catch (reason) {
      setError(errorText(reason));
    }
  };
  return (
    <>
      <section className="panel component-catalog">
        <div className="panel-head">
          <div>
            <h2>Справочник компонентов</h2>
            <p>Общий список для всех шаблонов заявок.</p>
          </div>
        </div>
        <div className="component-catalog-body">
          <form onSubmit={addCatalogComponent} className="component-add">
            <input
              name="componentName"
              placeholder="Например, Фискальный накопитель ФН-1.2"
              required
            />
            <Button>Добавить компонент</Button>
          </form>
          <div className="component-tags">
            {components
              .filter((component) => component.isActive)
              .map((component) => (
                <span key={component.id}>{component.name}</span>
              ))}
            {!components.some((component) => component.isActive) && (
              <small>
                Справочник пока пуст. Добавьте первый компонент выше.
              </small>
            )}
          </div>
        </div>
      </section>
      <div className="section-actions">
        <span>
          {types.filter((type) => type.isActive).length} активных шаблонов
        </span>
        <Button onClick={() => open("new")}>
          <Plus /> Новый шаблон
        </Button>
      </div>
      <div className="type-grid">
        {types.map((type) => (
          <article className="type-card" key={type.id}>
            <i style={{ background: type.color || "#ee7d6a" }} />
            <div>
              <h3>{type.name}</h3>
              <p>
                {type.description || "Без описания"}
                <br />
                {type.department.name} · {priorityLabel[type.defaultPriority]}
              </p>
              <span>
                {type.isActive ? "Активен" : "Отключён"} · полей:{" "}
                {type.templateFields?.length ?? 0} · компонентов:{" "}
                {type.componentRequirements.length}
              </span>
            </div>
            <Button kind="ghost" onClick={() => open(type)}>
              <Pencil />
            </Button>
          </article>
        ))}
      </div>
      <TemplateEditDialog
        editing={editing}
        setEditing={setEditing}
        departments={departments}
        error={error}
        submit={submit}
      />
    </>
  );
}
