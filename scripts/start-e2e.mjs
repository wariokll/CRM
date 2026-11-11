import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const envPath = resolve(root, "backend/.env.test");
if (!existsSync(envPath))
  throw new Error(
    "Create backend/.env.test and start the isolated test database first.",
  );

const testEnv = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      const key = line.slice(0, separator);
      const value = line.slice(separator + 1).replace(/^(["'])(.*)\1$/, "$2");
      return [key, value];
    }),
);
const databaseUrl = new URL(testEnv.DATABASE_URL ?? "");
if (!databaseUrl.pathname.endsWith("_test") || databaseUrl.port !== "3308")
  throw new Error("Refusing to start E2E outside the isolated test database.");

const env = {
  ...process.env,
  ...testEnv,
  NODE_ENV: "test",
  PORT: "3002",
  CLIENT_ORIGIN: "http://127.0.0.1:4173",
  VITE_API_PROXY_TARGET: "http://127.0.0.1:3002",
};
const children = [
  spawn(process.execPath, [resolve(root, "backend/dist/server.js")], {
    cwd: resolve(root, "backend"),
    env,
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    [
      resolve(root, "node_modules/vite/bin/vite.js"),
      "--config",
      "vite.e2e.config.ts",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
      "--strictPort",
    ],
    { cwd: root, env, stdio: "inherit" },
  ),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === "win32" && child.pid) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
      });
    } else {
      child.kill();
    }
  }
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => {
    if (!stopping && code !== 0) stop(code ?? 1);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

const deadline = Date.now() + 30_000;
while (Date.now() < deadline) {
  try {
    const response = await fetch("http://127.0.0.1:3002/api/health");
    if (response.ok) break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
if (Date.now() >= deadline) {
  stop(1);
  throw new Error(
    "The isolated E2E backend did not become healthy in 30 seconds.",
  );
}
