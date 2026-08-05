import "dotenv/config";
import { z } from "zod";

/**
 * Single source of truth for every environment variable the app needs.
 *
 * Add new variables here (not scattered across the codebase as raw
 * `process.env.X` reads) so that:
 *  - Missing/invalid values fail fast at boot with a clear error instead of
 *    surfacing as a confusing bug later at runtime.
 *  - Every consumer gets a fully typed, parsed value (numbers are numbers,
 *    enums are restricted, etc.) instead of `string | undefined`.
 *
 * Secrets (DB credentials, JWT signing keys, 3rd-party API keys, etc.)
 * should be declared here as `z.string().min(1)` (no default) so the app
 * refuses to start without them, and must only ever live in `.env`
 * (gitignored) — never committed. Add new ones the same way, e.g.:
 *   DATABASE_URL: z.string().url(),
 *   JWT_SECRET: z.string().min(32),
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default("0.0.0.0"),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // Shared secret the UI (or any client) must send as `X-API-Key` on every
  // `/api/*` request. No default on purpose — the app must refuse to start
  // without it configured.
  API_KEY: z.string().min(1, "API_KEY is required so the /api key guard can validate requests"),

  // Signs/verifies JWTs issued to authenticated users. Kept separate from
  // API_KEY: the API key gates "is this a legitimate client app", the JWT
  // identifies "which user is making this request".
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters long"),
});

type RawEnv = z.infer<typeof envSchema>;

function parseEnv(): RawEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Logged with plain console here because this runs before the app
    // (and therefore the pino logger) is constructed.
    console.error("Invalid or missing environment variables:\n");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error("\nCheck your .env file against .env.example and try again.");
    process.exit(1);
  }

  return result.data;
}

const rawEnv = parseEnv();

export interface EnvConfig {
  nodeEnv: RawEnv["NODE_ENV"];
  port: number;
  host: string;
  logLevel: RawEnv["LOG_LEVEL"];
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  apiKey: string;
  jwtSecret: string;
}

export const env: Readonly<EnvConfig> = Object.freeze({
  nodeEnv: rawEnv.NODE_ENV,
  port: rawEnv.PORT,
  host: rawEnv.HOST,
  logLevel: rawEnv.LOG_LEVEL,
  isProduction: rawEnv.NODE_ENV === "production",
  isDevelopment: rawEnv.NODE_ENV === "development",
  isTest: rawEnv.NODE_ENV === "test",
  apiKey: rawEnv.API_KEY,
  jwtSecret: rawEnv.JWT_SECRET,
});
