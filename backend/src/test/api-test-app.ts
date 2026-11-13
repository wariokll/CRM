import type { Express, RequestHandler } from "express";
import * as appModule from "../app.js";
import { prisma } from "../db.js";
import { createAccessToken } from "../utils/tokens.js";
import { Role, UserStatus } from "@prisma/client";

const factory = appModule as unknown as {
  createApp?: (dependencies: {
    prisma: typeof prisma;
    requestLogger: RequestHandler;
  }) => Express;
  app?: Express;
};

export const app = factory.createApp
  ? factory.createApp({
      prisma,
      requestLogger: (_req, _res, next) => next(),
    })
  : factory.app!;

let userSequence = 0;

export async function createApiUser(role: Role) {
  userSequence += 1;
  const user = await prisma.user.create({
    data: {
      ipName: `API ${role}`,
      email: `api-${role.toLowerCase()}-${userSequence}@example.test`,
      passwordHash: "unused-api-test-password",
      phone: `+700000${String(userSequence).padStart(5, "0")}`,
      role,
      status: UserStatus.ACTIVE,
    },
  });
  return {
    user,
    token: createAccessToken({ userId: user.id, role: user.role }),
  };
}

export function createApiDepartment(name: string, slug: string) {
  return prisma.department.create({ data: { name, slug } });
}

export async function clearApiDatabase() {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    try {
      const tables = await transaction.$queryRaw<Array<{ TABLE_NAME: string }>>`
        SELECT TABLE_NAME FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME <> '_prisma_migrations'
      `;
      for (const { TABLE_NAME } of tables) {
        if (!/^[A-Za-z0-9_]+$/.test(TABLE_NAME))
          throw new Error(`Unexpected test table name: ${TABLE_NAME}`);
        await transaction.$executeRawUnsafe(`DELETE FROM \`${TABLE_NAME}\``);
      }
    } finally {
      await transaction.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    }
  });
}
