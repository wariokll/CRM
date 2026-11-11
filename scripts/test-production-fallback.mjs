import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(resolve(root, "backend/package.json"));
const { parse } = require("dotenv");
const testEnv = parse(readFileSync(resolve(root, "backend/.env.test"), "utf8"));
Object.assign(process.env, testEnv, {
  NODE_ENV: "production",
  CLIENT_ORIGIN: "http://127.0.0.1:4173",
});

const [{ createApp }, { prisma }] = await Promise.all([
  import("../backend/dist/app.js"),
  import("../backend/dist/db.js"),
]);
const server = createApp().listen(0, "127.0.0.1");

try {
  await new Promise((resolveReady, reject) => {
    server.once("listening", resolveReady);
    server.once("error", reject);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;

  const directRoute = await fetch(`${origin}/organizations`);
  assert.equal(directRoute.status, 200);
  assert.match(directRoute.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await directRoute.text(), /id="root"/);

  const unknownApiRoute = await fetch(`${origin}/api/unknown`);
  assert.equal(unknownApiRoute.status, 404);
  assert.doesNotMatch(await unknownApiRoute.text(), /id="root"/);
} finally {
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
  await prisma.$disconnect();
}
