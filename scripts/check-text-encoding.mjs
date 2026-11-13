import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const sourceRoots = [
  "src",
  "backend/src",
  "backend/prisma",
  "scripts",
  "deploy/windows",
];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const damaged = [
  /\u0420\u0420/u,
  /\u0420\u0421/u,
  /\u0420[\u0402-\u040f\u0450-\u045f\u2019]/u,
  /\u0420[\u0080-\u00ff]/u,
  /\u0421[\u0080-\u00ff]/u,
  /\u0420[\u0454\u0455\u0456\u0457\u0458\u0459\u045a\u045b\u045c\u045d\u045e\u045f\u2014\u00b5\u00b1]/u,
  /\u043f\u0457\u0455\u0454/u,
  /\ufffd/u,
  /В[»«]/u,
  /в\u2020/u,
];
const failures = [];

function walk(path) {
  const absolute = resolve(root, path);
  if (statSync(absolute).isDirectory()) {
    for (const child of readdirSync(absolute)) walk(`${path}/${child}`);
    return;
  }
  if (!extensions.has(path.slice(path.lastIndexOf(".")))) return;
  const text = readFileSync(absolute, "utf8");
  const lines = text.split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (damaged.some((pattern) => pattern.test(line))) {
      failures.push(`${path}:${index + 1}: suspicious text encoding`);
    }
  });
}

for (const path of sourceRoots) walk(path);
if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
console.log("Text encoding check passed.");
