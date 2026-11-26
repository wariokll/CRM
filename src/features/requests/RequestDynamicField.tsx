import { Field } from "../../components/ui";
import { RequestComponents } from "./RequestComponents";
import type { Component, RequestType } from "../../types";

export function RequestDynamicField({
  field,
  components,
  selectedComponents,
  setSelectedComponents,
}: {
  field: NonNullable<RequestType["templateFields"]>[number];
  components: Component[];
  selectedComponents: Array<{ componentId: number; quantity: number }>;
  setSelectedComponents: (
    values: Array<{ componentId: number; quantity: number }>,
  ) => void;
}) {
  if (field.key === "__components")
    return (
      <RequestComponents
        components={components}
        selected={selectedComponents}
        onChange={setSelectedComponents}
      />
    );
  return (
    <Field label={`${field.label}${field.required ? " *" : ""}`}>
      {field.type === "TEXTAREA" ? (
        <textarea name={field.key} required={field.required} />
      ) : field.type === "SELECT" ? (
        <select name={field.key} required={field.required}>
          <option value="">Выберите</option>
          {field.options?.map((option) => (
            <option key={option}>{option}</option>
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
}
