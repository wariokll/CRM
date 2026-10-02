import { describe, expect, it } from "vitest";
import {
  moveToPreviousBusinessDay,
  nextRecurringBusinessDate,
} from "./business-days.js";

describe("recurring request business days", () => {
  it("moves a weekend to the preceding Friday and preserves the time", () => {
    const result = moveToPreviousBusinessDay(new Date(2026, 4, 9, 14, 30));
    expect(result).toEqual(new Date(2026, 4, 8, 14, 30));
  });

  it("moves a federal holiday to the preceding working day", () => {
    const result = moveToPreviousBusinessDay(new Date(2026, 5, 12, 10, 0));
    expect(result).toEqual(new Date(2026, 5, 11, 10, 0));
  });

  it("calculates the next interval before applying the working-day rule", () => {
    const result = nextRecurringBusinessDate(new Date(2026, 4, 7, 9, 0), 2);
    expect(result).toEqual(new Date(2026, 4, 8, 9, 0));
  });
});
