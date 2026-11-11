import type { ServiceRequest } from "../../types";

export function RequestTemplateData({ item }: { item: ServiceRequest }) {
  const data = item.templateData ?? {};
  const knownFields = item.type.templateFields ?? [];
  const used = new Set<string>();
  const rows = knownFields
    .flatMap<{ key: string; label: string; value: unknown }>((field) => {
      used.add(field.key);
      const value = data[field.key];
      if (value === undefined || value === null || value === "") return [];
      return [{ key: field.key, label: field.label, value }];
    })
    .concat(
      Object.entries(data)
        .filter(
          ([key, value]) =>
            !used.has(key) &&
            value !== undefined &&
            value !== null &&
            value !== "",
        )
        .map(([key, value]) => ({ key, label: key, value })),
    );
  const present = (value: unknown) =>
    value === true
      ? "Да"
      : value === false
        ? "Нет"
        : Array.isArray(value)
          ? value.join(", ")
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
  if (!rows.length) return null;
  return (
    <section className="template-data">
      <h3>Дополнительные данные</h3>
      <div>
        {rows.map((row) => (
          <p key={row.key}>
            <small>{row.label}</small>
            <b>{present(row.value)}</b>
          </p>
        ))}
      </div>
    </section>
  );
}
