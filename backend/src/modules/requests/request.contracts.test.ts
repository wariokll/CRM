import { describe, expect, it } from "vitest";
import { validateRequiredTemplateFields } from "./request.contracts.js";

describe("request template validation", () => {
  it("reports the precise missing template field", () => {
    expect(() =>
      validateRequiredTemplateFields(
        [{ key: "serial", label: "Серийный номер", required: true }],
        {},
      ),
    ).toThrow("Серийный номер");
  });

  it("accepts optional omissions and supplied required data", () => {
    expect(() =>
      validateRequiredTemplateFields(
        [
          { key: "serial", label: "Серийный номер", required: true },
          { key: "note", label: "Примечание", required: false },
        ],
        { serial: "ABC-42" },
      ),
    ).not.toThrow();
  });
});
