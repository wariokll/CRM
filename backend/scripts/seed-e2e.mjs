import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const testEnv = parse(readFileSync(resolve(backendRoot, ".env.test")));
Object.assign(process.env, testEnv);
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (!databaseUrl.pathname.endsWith("_test") || databaseUrl.port !== "3308")
  throw new Error(
    "E2E setup requires the isolated *_test database on port 3308.",
  );

execFileSync(
  process.execPath,
  [
    resolve(backendRoot, "node_modules/prisma/build/index.js"),
    "migrate",
    "deploy",
  ],
  { cwd: backendRoot, env: process.env, stdio: "inherit" },
);

const [{ PrismaClient, Role, UserStatus }, bcrypt] = await Promise.all([
  import("@prisma/client"),
  import("bcrypt"),
]);
const prisma = new PrismaClient();
try {
  await prisma.department.upsert({
    where: { slug: "e2e-test" },
    update: { name: "E2E Test Department", isActive: true },
    create: { slug: "e2e-test", name: "E2E Test Department" },
  });
  for (const user of [
    {
      ipName: "E2E Director",
      email: "e2e-director@example.test",
      phone: "+70000000991",
      role: Role.DIRECTOR,
    },
    {
      ipName: "E2E Client",
      email: "e2e-client@example.test",
      phone: "+70000000992",
      role: Role.CLIENT,
    },
  ]) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        ipName: user.ipName,
        phone: user.phone,
        role: user.role,
        status: UserStatus.ACTIVE,
        passwordHash: await bcrypt.default.hash("E2E-Test-Password-123", 4),
      },
      create: {
        ...user,
        status: UserStatus.ACTIVE,
        passwordHash: await bcrypt.default.hash("E2E-Test-Password-123", 4),
      },
    });
  }
} finally {
  await prisma.$disconnect();
}
