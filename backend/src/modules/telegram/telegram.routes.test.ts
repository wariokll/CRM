import {
  Role,
  TelegramIntegrationKind,
  TelegramIntegrationStatus,
  UserStatus,
} from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db.js";
import { createAccessToken } from "../../utils/tokens.js";

const app = createApp({ prisma, requestLogger: (_req, _res, next) => next() });
const suffix = `${Date.now()}`;
let adminId: number;
let token: string;
let integrationId: number;
let chatId: number;
const organizationIds: number[] = [];
const storeIds: number[] = [];
let sequence = 0;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: {
      ipName: "Telegram route director",
      email: `telegram-director-${suffix}@example.test`,
      passwordHash: "not-used-by-access-token-tests",
      phone: `+7119${suffix.slice(-7)}`,
      role: Role.DIRECTOR,
      status: UserStatus.ACTIVE,
    },
  });
  adminId = admin.id;
  token = createAccessToken({ userId: admin.id, role: admin.role });
  const integration = await prisma.telegramIntegration.create({
    data: {
      kind: TelegramIntegrationKind.USER_ACCOUNT,
      status: TelegramIntegrationStatus.ACTIVE,
    },
  });
  integrationId = integration.id;
  const chat = await prisma.telegramChat.create({
    data: {
      integrationId,
      externalChatId: `telegram-${suffix}`,
      title: "Telegram test chat",
    },
  });
  chatId = chat.id;
  for (let index = 0; index < 2; index += 1) {
    sequence += 1;
    const organization = await prisma.organization.create({
      data: {
        legalName: `Telegram organization ${suffix}-${sequence}`,
        shortName: `Telegram ${sequence}`,
      },
    });
    organizationIds.push(organization.id);
    const store = await prisma.store.create({
      data: {
        organizationId: organization.id,
        name: `Telegram store ${sequence}`,
        address: "Telegram address",
      },
    });
    storeIds.push(store.id);
  }
});

afterAll(async () => {
  if (integrationId)
    await prisma.telegramIntegration.delete({ where: { id: integrationId } });
  if (storeIds.length)
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  if (organizationIds.length)
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
  if (adminId) await prisma.user.delete({ where: { id: adminId } });
});

describe("telegram endpoint behavior", () => {
  it("replaces chat links and removes duplicate ids", async () => {
    const response = await request(app)
      .put(`/api/telegram/chats/${chatId}/links`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        organizationIds: [organizationIds[0], organizationIds[0]],
        storeIds: [storeIds[0], storeIds[0]],
      });

    expect(response.status).toBe(200);
    expect(response.body.organizationLinks).toHaveLength(1);
    expect(response.body.storeLinks).toHaveLength(1);
  });

  it("rejects links to missing organizations or stores", async () => {
    const response = await request(app)
      .put(`/api/telegram/chats/${chatId}/links`)
      .set("Authorization", `Bearer ${token}`)
      .send({ organizationIds: [987654321], storeIds: [] });

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(expect.any(String));
  });

  it("keeps message sending disabled when integration is active", async () => {
    const response = await request(app)
      .post(`/api/telegram/chats/${chatId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "Characterized message" });

    expect(response.status).toBe(501);
    expect(response.body.message).toEqual(expect.any(String));
  });

  it("returns 404 for an unknown chat when sending a message", async () => {
    const response = await request(app)
      .post("/api/telegram/chats/987654321/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "Characterized message" });

    expect(response.status).toBe(404);
  });
});
