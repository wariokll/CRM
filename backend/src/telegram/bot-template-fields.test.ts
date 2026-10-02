import { describe, expect, it } from "vitest";
import {
  parseFieldValue,
  templateFields,
} from "../modules/telegram/template-fields.js";

describe("Telegram template fields", () => {
  it("keeps only complete fields from a request template", () => {
    expect(
      templateFields([
        { key: "serial", label: "Серийный номер", type: "TEXT" },
        null,
        { key: 2 },
      ]),
    ).toEqual([{ key: "serial", label: "Серийный номер", type: "TEXT" }]);
  });

  it("requires mandatory values and preserves optional omissions", () => {
    expect(
      parseFieldValue(
        { key: "inn", label: "ИНН", type: "TEXT", required: true },
        "-",
      ).ok,
    ).toBe(false);
    expect(
      parseFieldValue({ key: "note", label: "Примечание", type: "TEXT" }, "-"),
    ).toEqual({ ok: true });
  });

  it("validates select, number and checkbox answers", () => {
    expect(
      parseFieldValue(
        { key: "model", label: "Модель", type: "SELECT", options: ["A", "B"] },
        "2",
      ),
    ).toEqual({ ok: true, value: "B" });
    expect(
      parseFieldValue(
        { key: "amount", label: "Количество", type: "NUMBER" },
        "2,5",
      ),
    ).toEqual({ ok: true, value: 2.5 });
    expect(
      parseFieldValue(
        { key: "confirmed", label: "Подтверждено", type: "CHECKBOX" },
        "да",
      ),
    ).toEqual({ ok: true, value: true });
  });
});
