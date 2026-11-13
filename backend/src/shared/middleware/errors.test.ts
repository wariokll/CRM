import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
const currentErrorHandler = "./" + "errors.js";
const legacyErrorHandler = "../../middleware/" + "errors.js";
const currentAppError = "../" + "errors.js";
const legacyAppError = "../../utils/" + "app-error.js";
const { errorHandler } = await import(currentErrorHandler).catch(
  () => import(legacyErrorHandler),
);
const { AppError } = await import(currentAppError).catch(
  () => import(legacyAppError),
);

function responseMock() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function invoke(error: unknown, response = responseMock()) {
  errorHandler(error, {} as Request, response as unknown as Response, vi.fn());
  return response;
}

describe("HTTP error formatting", () => {
  it("preserves application error status and message", () => {
    const response = invoke(new AppError("Недоступно", 403));
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ message: "Недоступно" });
  });

  it("formats a validation issue with its Russian field name", () => {
    const parsed = z
      .object({ status: z.string().min(2) })
      .safeParse({ status: "" });
    if (parsed.success) throw new Error("Expected validation failure");
    const response = invoke(parsed.error);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: "Статус: заполните поле (минимум 2 симв.)",
      issues: ["Статус: заполните поле (минимум 2 симв.)"],
    });
  });

  it("combines multiple validation issues", () => {
    const parsed = z
      .object({ email: z.string().email(), status: z.string() })
      .safeParse({ email: "bad", status: undefined });
    if (parsed.success) throw new Error("Expected validation failure");
    const response = invoke(parsed.error);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: expect.stringContaining("Исправьте поля:"),
      issues: expect.arrayContaining([
        expect.stringContaining("email"),
        "Статус: поле обязательно",
      ]),
    });
  });

  it.each([
    ["P2002", 409, "Запись с такими данными уже существует"],
    ["P2025", 404, "Запись не найдена"],
  ])("maps database error %s", (code, status, message) => {
    const response = invoke({ code });
    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({ message });
  });

  it("logs unexpected errors and returns a generic server message", () => {
    const error = new Error("private details");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = invoke(error);
    expect(log).toHaveBeenCalledWith(error);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Внутренняя ошибка сервера",
    });
    log.mockRestore();
  });
});
