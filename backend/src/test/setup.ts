import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.test"), override: true });

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (!databaseUrl.pathname.replace(/^\//, "").endsWith("_test")) {
  throw new Error(
    "Backend tests require a dedicated database whose name ends with _test.",
  );
}
