import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export default async function globalSetup() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const ensure = spawnSync(
    process.execPath,
    [resolve(root, "scripts/ensure-test-db.mjs")],
    { cwd: root, stdio: "inherit" },
  );
  if (ensure.status !== 0)
    throw new Error(`Test database startup failed (exit ${ensure.status}).`);

  const seed = resolve(root, "backend/scripts/seed-e2e.mjs");
  const result = spawnSync(process.execPath, [seed], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0)
    throw new Error(`E2E database setup failed (exit ${result.status}).`);
}
