import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  getBoardAccess,
  getBoardArchive,
  restoreBoardCard,
  updateBoardAccess,
  updateBoardLayout,
} from "./boards/queries";
import { getStoreAccess, saveStoreAccess } from "./stores/queries";
import type { BoardAccessUser } from "../types";
import { server } from "../test/server";

describe("feature query functions", () => {
  it("loads and updates board access through the characterized endpoints", async () => {
    const requests: { method: string; path: string; body?: unknown }[] = [];
    server.use(
      http.get("/api/boards/7/access", ({ request }) => {
        requests.push({
          method: request.method,
          path: new URL(request.url).pathname,
        });
        return HttpResponse.json([]);
      }),
      http.post("/api/boards/7/access", async ({ request }) => {
        requests.push({
          method: request.method,
          path: new URL(request.url).pathname,
          body: await request.json(),
        });
        return HttpResponse.json({});
      }),
      http.delete("/api/boards/7/access/9", ({ request }) => {
        requests.push({
          method: request.method,
          path: new URL(request.url).pathname,
        });
        return HttpResponse.json({});
      }),
    );
    const user = {
      id: 9,
      ipName: "Staff",
      email: "staff@example.test",
      role: "MASTER",
      hasAccess: false,
      isOwner: false,
    } satisfies BoardAccessUser;

    await getBoardAccess(7);
    await updateBoardAccess(7, user);
    await updateBoardAccess(7, { ...user, hasAccess: true });

    expect(requests).toEqual([
      { method: "GET", path: "/api/boards/7/access" },
      {
        method: "POST",
        path: "/api/boards/7/access",
        body: { userId: 9 },
      },
      { method: "DELETE", path: "/api/boards/7/access/9" },
    ]);
  });

  it("saves layout and restores an archived board card with their versions", async () => {
    const requests: { method: string; path: string; body: unknown }[] = [];
    server.use(
      http.patch("/api/boards/7/layout", async ({ request }) => {
        requests.push({
          method: request.method,
          path: new URL(request.url).pathname,
          body: await request.json(),
        });
        return HttpResponse.json({});
      }),
      http.get("/api/boards/7/archive", ({ request }) => {
        requests.push({
          method: request.method,
          path: new URL(request.url).pathname,
          body: null,
        });
        return HttpResponse.json([]);
      }),
      http.post("/api/boards/cards/12/restore", async ({ request }) => {
        requests.push({
          method: request.method,
          path: new URL(request.url).pathname,
          body: await request.json(),
        });
        return HttpResponse.json({});
      }),
    );

    await updateBoardLayout(7, [
      { id: 2, version: 4, width: 420, cardsPerRow: 2 },
    ]);
    await getBoardArchive(7, new AbortController().signal);
    await restoreBoardCard(12, 6, 2);

    expect(requests).toEqual([
      {
        method: "PATCH",
        path: "/api/boards/7/layout",
        body: {
          columns: [{ id: 2, version: 4, width: 420, cardsPerRow: 2 }],
        },
      },
      { method: "GET", path: "/api/boards/7/archive", body: null },
      {
        method: "POST",
        path: "/api/boards/cards/12/restore",
        body: { version: 6, targetColumnId: 2 },
      },
    ]);
  });

  it("loads and saves store access without changing payloads", async () => {
    const requests: { method: string; body?: unknown }[] = [];
    server.use(
      http.get("/api/stores/5/access", ({ request }) => {
        requests.push({ method: request.method });
        return HttpResponse.json({ anydeskId: "123" });
      }),
      http.put("/api/stores/5/access", async ({ request }) => {
        requests.push({ method: request.method, body: await request.json() });
        return HttpResponse.json({});
      }),
    );

    await expect(getStoreAccess(5)).resolves.toEqual({ anydeskId: "123" });
    await saveStoreAccess(5, { anydeskId: "456" });

    expect(requests).toEqual([
      { method: "GET" },
      { method: "PUT", body: { anydeskId: "456" } },
    ]);
  });
});
