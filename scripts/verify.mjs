import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const node = process.execPath;
const run = (label, executable, args, cwd = root) => {
  console.log(`\n> ${label}`);
  const result = spawnSync(executable, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const rootCli = (file) => resolve(root, "node_modules", file);
const backendCli = (file) => resolve(root, "backend/node_modules", file);

run("Text encoding check", node, [
  resolve(root, "scripts/check-text-encoding.mjs"),
]);
run("Frontend TypeScript", node, [
  rootCli("typescript/bin/tsc"),
  "-b",
  "--pretty",
  "false",
]);
run("Backend TypeScript", node, [
  backendCli("typescript/bin/tsc"),
  "-p",
  "backend/tsconfig.json",
  "--noEmit",
]);
run("ESLint", node, [rootCli("eslint/bin/eslint.js"), "src", "backend/src"]);
run("Prettier", node, [
  rootCli("prettier/bin/prettier.cjs"),
  "--check",
  "package.json",
  "vite.config.ts",
  "vite.e2e.config.ts",
  "vitest.config.ts",
  "playwright.config.ts",
  "eslint.config.js",
  ".github/workflows/ci.yml",
  "src/test/**/*.{ts,tsx}",
  "e2e/**/*.{ts,tsx}",
  "scripts/**/*.mjs",
  "backend/src/app.ts",
  "backend/src/server.ts",
  "backend/src/config.ts",
  "backend/src/shared/**/*.ts",
  "backend/src/modules/recurring-requests/**/*.ts",
  "backend/src/modules/auth/**/*.ts",
  "backend/src/modules/departments/**/*.ts",
  "backend/src/modules/components/**/*.ts",
  "backend/src/modules/request-types/**/*.ts",
  "backend/src/modules/users/**/*.ts",
  "backend/src/modules/moderation/**/*.ts",
  "backend/src/modules/staff/**/*.ts",
  "backend/src/modules/telegram/**/*.ts",
  "backend/src/modules/organizations/**/*.ts",
  "backend/src/modules/stores/**/*.ts",
  "backend/src/modules/knowledge/**/*.ts",
  "backend/src/modules/boards/**/*.ts",
  "backend/src/modules/requests/**/*.ts",
  "backend/src/test/**/*.ts",
  "backend/vitest.config.ts",
  "backend/vitest.backend.config.ts",
  "backend/package.json",
  "backend/scripts/**/*.mjs",
]);
run("Frontend unit tests", node, [
  rootCli("vitest/vitest.mjs"),
  "run",
  "--config",
  "vitest.config.ts",
  "--coverage",
]);
run("Isolated test database", node, [
  resolve(root, "scripts/ensure-test-db.mjs"),
]);
run("Backend integration tests", node, [
  resolve(root, "backend/scripts/test-backend.mjs"),
]);
run("Frontend TypeScript build", node, [
  rootCli("typescript/bin/tsc"),
  "-b",
  "--pretty",
  "false",
]);
run("Vite production build", node, [rootCli("vite/bin/vite.js"), "build"]);
run("Backend production build", node, [
  backendCli("typescript/bin/tsc"),
  "-p",
  "backend/tsconfig.json",
]);
run("Production SPA fallback smoke", node, [
  resolve(root, "scripts/test-production-fallback.mjs"),
]);
run("Playwright smoke tests", node, [
  rootCli("@playwright/test/cli.js"),
  "test",
  "--config",
  "playwright.config.ts",
]);
