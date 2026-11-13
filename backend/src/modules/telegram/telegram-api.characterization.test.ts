import {
  OrganizationType,
  Role,
  TelegramIntegrationKind,
  TelegramIntegrationStatus,
} from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../../db.js";
import {
  app,
  clearApiDatabase,
  createApiUser,
} from "../../test/api-test-app.js";

beforeEach(clearApiDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Telegram API characterization", () => {
  it("lists integrations, chats, messages, and updates a chat link", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const auth = { Authorization: `Bearer ${director.token}` };
    const integration = await prisma.telegramIntegration.create({
      data: {
        kind: TelegramIntegrationKind.USER_ACCOUNT,
        status: TelegramIntegrationStatus.ACTIVE,
      },
    });
    const organization = await prisma.organization.create({
      data: {
        type: OrganizationType.IP,
        legalName: "Telegram API organization",
        createdByUserId: director.user.id,
        members: { create: { userId: director.user.id, isPrimary: true } },
      },
    });
    const store = await prisma.store.create({
      data: {
        organizationId: organization.id,
        name: "Telegram API store",
        address: "9 Example Street",
      },
    });
    const chat = await prisma.telegramChat.create({
      data: {
        integrationId: integration.id,
        externalChatId: "telegram-api-chat",
        title: "Telegram API chat",
      },
    });

    const integrations = await request(app)
      .get("/api/telegram/integrations")
      .set(auth);
    expect(integrations.status).toBe(200);
    expect(integrations.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: integration.id })]),
    );

    const chats = await request(app).get("/api/telegram/chats").set(auth);
    expect(chats.status).toBe(200);
    expect(chats.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: chat.id })]),
    );

    const messages = await request(app)
      .get(`/api/telegram/chats/${chat.id}/messages`)
      .set(auth);
    expect(messages.status).toBe(200);
    expect(messages.body).toEqual([]);

    const linked = await request(app)
      .patch(`/api/telegram/chats/${chat.id}/link`)
      .set(auth)
      .send({
        linkedUserId: director.user.id,
        organizationId: organization.id,
      });
    expect(linked.status).toBe(200);
    expect(linked.body).toMatchObject({
      id: chat.id,
      linkedUserId: director.user.id,
      organizationId: organization.id,
    });
    expect(store.organizationId).toBe(organization.id);
  });

  it("rejects invalid chat IDs and denies clients", async () => {
    const director = await createApiUser(Role.DIRECTOR);
    const client = await createApiUser(Role.CLIENT);
    const invalidId = await request(app)
      .get("/api/telegram/chats/not-an-id/messages")
      .set("Authorization", `Bearer ${director.token}`);
    expect(invalidId.status).toBe(500);

    const denied = await request(app)
      .get("/api/telegram/integrations")
      .set("Authorization", `Bearer ${client.token}`);
    expect(denied.status).toBe(403);
  });
});
