import { spawnSync } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const listening = await new Promise((resolveResult) => {
  const socket = net.connect({ host: "127.0.0.1", port: 3308 });
  socket.setTimeout(750);
  socket.once("connect", () => {
    socket.destroy();
    resolveResult(true);
  });
  socket.once("error", () => resolveResult(false));
  socket.once("timeout", () => {
    socket.destroy();
    resolveResult(false);
  });
});

if (listening) process.exit(0);
if (process.platform !== "win32")
  throw new Error(
    "The isolated MariaDB test service must be running on port 3308.",
  );

const result = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    resolve(root, "backend/scripts/start-test-db.ps1"),
  ],
  { cwd: root, stdio: "inherit" },
);
if (result.status !== 0)
  throw new Error(`Unable to start isolated MariaDB (exit ${result.status}).`);
