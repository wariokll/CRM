import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  PORT: z
    .string()
    .default("3001")
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.string().optional(),
  COOKIE_SECURE: z.string().optional(),
  JWT_ACCESS_SECRET: z
    .string()
    .min(1, "Missing required environment variable: JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(1, "Missing required environment variable: JWT_REFRESH_SECRET"),
  ENCRYPTION_KEY: z
    .string()
    .min(1, "Missing required environment variable: ENCRYPTION_KEY"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().default("TMP_BAZIS_BOT"),
  TELEGRAM_REGISTRATION_URL: z.string().optional(),
});

const parsed = environmentSchema.safeParse(process.env);
if (!parsed.success) {
  const portIssue = parsed.error.issues.find(
    (issue) => issue.path[0] === "PORT",
  );
  if (portIssue) throw new Error("PORT must be a valid TCP port");
  throw new Error(
    parsed.error.issues[0]?.message ?? "Invalid environment configuration",
  );
}
const env = parsed.data;

export const config = {
  port: env.PORT,
  clientOrigin: env.CLIENT_ORIGIN,
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  cookieSecure: env.COOKIE_SECURE === "true",
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  encryptionKey: env.ENCRYPTION_KEY,
  telegramBotToken: env.TELEGRAM_BOT_TOKEN,
  telegramBotUsername: env.TELEGRAM_BOT_USERNAME,
  telegramRegistrationUrl: env.TELEGRAM_REGISTRATION_URL,
};

const localOrigin = (() => {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(
      new URL(config.clientOrigin).hostname,
    );
  } catch {
    return false;
  }
})();
if (config.isProduction && !localOrigin && !config.cookieSecure)
  throw new Error("COOKIE_SECURE=true is required in production");
