import { Button } from "../../components/ui";
import type { Component } from "../../types";

export function RequestComponents({
  components,
  selected,
  onChange,
}: {
  components: Component[];
  selected: Array<{ componentId: number; quantity: number }>;
  onChange: (next: Array<{ componentId: number; quantity: number }>) => void;
}) {
  const available = components.filter((component) => component.isActive);
  const add = () => {
    const first = available.find(
      (component) =>
        !selected.some((item) => item.componentId === component.id),
    );
    if (first) onChange([...selected, { componentId: first.id, quantity: 1 }]);
  };
  return (
    <section className="template-components">
      <div>
        <h3>Компоненты для этой заявки</h3>
        <p>Выберите фактически нужные компоненты и их количество.</p>
      </div>
      {selected.map((item, index) => (
        <div
          className="component-requirement"
          key={`${item.componentId}-${index}`}
        >
          <select
            value={item.componentId}
            onChange={(event) =>
              onChange(
                selected.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, componentId: Number(event.target.value) }
                    : row,
                ),
              )
            }
          >
            {available.map((component) => (
              <option value={component.id} key={component.id}>
                {component.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Количество"
            type="number"
            min="1"
            value={item.quantity}
            onChange={(event) =>
              onChange(
                selected.map((row, rowIndex) =>
                  rowIndex === index
                    ? {
                        ...row,
                        quantity: Math.max(1, Number(event.target.value) || 1),
                      }
                    : row,
                ),
              )
            }
          />
          <Button
            kind="ghost"
            type="button"
            onClick={() =>
              onChange(selected.filter((_, rowIndex) => rowIndex !== index))
            }
          >
            Удалить
          </Button>
        </div>
      ))}
      <Button
        kind="secondary"
        type="button"
        onClick={add}
        disabled={
          !available.some(
            (component) =>
              !selected.some((item) => item.componentId === component.id),
          )
        }
      >
        Добавить компонент
      </Button>
      {!available.length && (
        <small>
          Справочник компонентов пуст. Добавьте позиции на странице «Шаблоны
          заявок».
        </small>
      )}
    </section>
  );
}
