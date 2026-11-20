import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppContent } from "../App.js";
import { AuthProvider } from "../auth/AuthContext.js";
import type { User } from "../types.js";
import { server } from "./server.js";

function renderApp(initialEntries = ["/"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AppContent />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const director: User = {
  id: 1,
  ipName: "Test Director",
  email: "director@example.test",
  phone: "+70000000000",
  role: "DIRECTOR",
  status: "ACTIVE",
  rejectionReason: null,
  createdAt: new Date().toISOString(),
  permissionOverrides: [],
  departmentMemberships: [],
  organizations: [],
};

function installAppHandlers(user: User = director) {
  server.use(
    http.post("/api/auth/refresh", () =>
      HttpResponse.json({}, { status: 401 }),
    ),
    http.post("/api/auth/login", () =>
      HttpResponse.json({ accessToken: "test-access-token", user }),
    ),
    http.post(
      "/api/auth/logout",
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.get("/api/requests", () => HttpResponse.json([])),
    http.get("/api/stores", () => HttpResponse.json([])),
    http.get("/api/organizations", () => HttpResponse.json([])),
    http.get("/api/request-types", () => HttpResponse.json([])),
    http.get("/api/departments", () => HttpResponse.json([])),
    http.get("/api/staff", () => HttpResponse.json([])),
    http.get("/api/telegram/integrations", () => HttpResponse.json([])),
    http.get("/api/telegram/chats", () => HttpResponse.json([])),
  );
}

describe("current CRM shell", () => {
  it("logs in, loads the dashboard, and exposes only role-authorized sections", async () => {
    installAppHandlers();
    renderApp();

    await screen.findByRole("heading", { name: /Вход в/ });
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: director.email },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await screen.findByRole("heading", { name: "Обзор" });
    expect(screen.getByRole("button", { name: /Сотрудники/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /База знаний/ })).toBeVisible();
  });

  it("hides staff-only sections from a client account", async () => {
    const client = { ...director, role: "CLIENT" as const };
    installAppHandlers(client);
    renderApp();
    fireEvent.change(await screen.findByRole("textbox", { name: "Email" }), {
      target: { value: client.email },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await screen.findByRole("heading", { name: "Обзор" });
    expect(
      screen.queryByRole("button", { name: /Сотрудники/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Шаблоны/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the access denied page for a restricted direct URL", async () => {
    const client = { ...director, role: "CLIENT" as const };
    installAppHandlers(client);
    renderApp(["/staff"]);
    fireEvent.change(await screen.findByRole("textbox", { name: "Email" }), {
      target: { value: client.email },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(
      await screen.findByRole("heading", { name: "Нет доступа" }),
    ).toBeVisible();
  });

  it("shows the existing authentication error when login is rejected", async () => {
    installAppHandlers();
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json({ message: "invalid credentials" }, { status: 401 }),
      ),
    );
    renderApp();
    fireEvent.change(await screen.findByRole("textbox", { name: "Email" }), {
      target: { value: director.email },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "bad-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() =>
      expect(screen.getByText("invalid credentials")).toBeVisible(),
    );
  });
});
