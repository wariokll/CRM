import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const envPath = resolve(backendRoot, ".env.test");

if (!existsSync(envPath)) {
  throw new Error(
    "Create backend/.env.test from backend/.env.test.example and start the isolated MariaDB test instance first.",
  );
}

const testEnv = parse(readFileSync(envPath));
const databaseUrl = new URL(testEnv.DATABASE_URL ?? "");
const databaseName = databaseUrl.pathname.replace(/^\//, "");

if (!databaseName.endsWith("_test")) {
  throw new Error(
    "Refusing to run backend tests unless DATABASE_URL targets a *_test database.",
  );
}

const env = {
  ...process.env,
  ...testEnv,
  NODE_ENV: "test",
};
const prismaCli = resolve(backendRoot, "node_modules/prisma/build/index.js");
const vitestCli = resolve(backendRoot, "node_modules/vitest/vitest.mjs");

execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  cwd: backendRoot,
  env,
  stdio: "inherit",
});
const schemaDiff = spawnSync(
  process.execPath,
  [
    prismaCli,
    "migrate",
    "diff",
    "--from-url",
    databaseUrl.href,
    "--to-schema-datamodel",
    resolve(backendRoot, "prisma/schema.prisma"),
    "--exit-code",
  ],
  {
    cwd: backendRoot,
    env,
    encoding: "utf8",
  },
);
if (schemaDiff.status !== 0) {
  process.stderr.write(schemaDiff.stdout ?? "");
  process.stderr.write(schemaDiff.stderr ?? "");
  throw new Error(`Prisma schema check failed (exit ${schemaDiff.status}).`);
} else {
  process.stdout.write(schemaDiff.stdout ?? "");
}
execFileSync(
  process.execPath,
  [
    vitestCli,
    "run",
    "--config",
    resolve(backendRoot, "vitest.backend.config.ts"),
  ],
  {
    cwd: backendRoot,
    env,
    stdio: "inherit",
  },
);
