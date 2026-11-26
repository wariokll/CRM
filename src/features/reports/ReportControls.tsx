import { RefreshCw } from "lucide-react";
import { Button, Field } from "../../components/ui";
import type { Component } from "../../types";

type ReportView = "overview" | "clients" | "team" | "requests" | "procurement";

export function ReportControls({
  from,
  to,
  view,
  componentId,
  components,
  setParam,
  setView,
  setComponentId,
  refetch,
}: {
  from: string;
  to: string;
  view: ReportView;
  componentId: string;
  components: Component[];
  setParam: (key: string, value: string) => void;
  setView: (view: ReportView) => void;
  setComponentId: (value: string) => void;
  refetch: () => unknown;
}) {
  return (
    <section className="panel table-panel">
      <div className="toolbar">
        <Field label="С">
          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) => setParam("from", event.target.value)}
          />
        </Field>
        <Field label="По">
          <input
            type="date"
            value={to}
            min={from}
            onChange={(event) => setParam("to", event.target.value)}
          />
        </Field>
        {view === "procurement" && (
          <Field label="Компонент">
            <select
              value={componentId}
              onChange={(event) => setComponentId(event.target.value)}
            >
              <option value="">Все компоненты</option>
              {components
                .filter((component) => component.isActive)
                .map((component) => (
                  <option value={component.id} key={component.id}>
                    {component.name}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <Button kind="secondary" onClick={() => void refetch()}>
          <RefreshCw /> Обновить
        </Button>
      </div>
      <div className="segmented report-tabs">
        {(
          [
            ["overview", "Сводка"],
            ["clients", "Клиенты и точки"],
            ["team", "Команда"],
            ["requests", "Реестр заявок"],
            ["procurement", "Планируемые закупки"],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={view === value ? "active" : ""}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
