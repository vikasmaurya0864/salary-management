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
  // Short-lived access JWT lifetime in seconds (default 15 minutes).
  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  // Opaque refresh token lifetime in days. Stored (hashed) in `refresh_tokens`.
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // ---- PostgreSQL connection ----
  DB_HOST: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
  // Set to "true" only when connecting to a Postgres provider that requires
  // SSL (most managed cloud DBs). Leave unset for local development.
  DB_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // Bootstrap admin account, created by the seeder so there's a way to log
  // in and start creating HR/Employee users on a fresh database.
  ADMIN_EMAIL: z.string().email().default("admin@salary-management.local"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters long"),

  // ---- Email (attendance reminder / auto-absence cron jobs) ----
  // Deliberately all optional: local dev should work without SMTP
  // configured — the mailer just logs a warning and skips sending instead
  // of failing the jobs that call it (which still need to mark absentees
  // in the DB regardless of whether email is set up).
  // `.optional()` alone isn't enough: an empty `SMTP_HOST=` line in `.env`
  // parses as `""`, not `undefined`. Treat blank strings as "unset" too.
  SMTP_HOST: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  SMTP_PASSWORD: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_FROM: z.string().min(1).default("Salary Management <no-reply@salary-management.local>"),
  // Contact address shown in attendance reminder emails ("contact HR team …").
  HR_CONTACT_EMAIL: z.string().email().default("hr@info.in"),

  // ---- Cron jobs ----
  // Timezone the 8am/7pm attendance job schedules are interpreted in. Keep
  // this as "UTC" unless `src/utils/date.ts`'s "today"/day-of-week
  // calculations (also UTC-based) are changed to match — otherwise the
  // jobs' notion of "today" and the app's could disagree near midnight.
  CRON_TIMEZONE: z.string().min(1).default("UTC"),
  // Escape hatch to disable both attendance cron jobs entirely (e.g. when
  // running multiple app instances and only one should run them, or in tests).
  ENABLE_CRON_JOBS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
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
  jwtAccessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  adminEmail: string;
  adminPassword: string;
  hrContactEmail: string;
  smtp: {
    host: string | undefined;
    port: number;
    user: string | undefined;
    password: string | undefined;
    secure: boolean;
    from: string;
  };
  cronTimezone: string;
  enableCronJobs: boolean;
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
  jwtAccessTokenTtlSeconds: rawEnv.JWT_ACCESS_TOKEN_TTL_SECONDS,
  refreshTokenTtlDays: rawEnv.REFRESH_TOKEN_TTL_DAYS,
  db: Object.freeze({
    host: rawEnv.DB_HOST,
    port: rawEnv.DB_PORT,
    name: rawEnv.DB_NAME,
    user: rawEnv.DB_USER,
    password: rawEnv.DB_PASSWORD,
    ssl: rawEnv.DB_SSL,
  }),
  adminEmail: rawEnv.ADMIN_EMAIL,
  adminPassword: rawEnv.ADMIN_PASSWORD,
  hrContactEmail: rawEnv.HR_CONTACT_EMAIL,
  smtp: Object.freeze({
    host: rawEnv.SMTP_HOST,
    port: rawEnv.SMTP_PORT,
    user: rawEnv.SMTP_USER,
    password: rawEnv.SMTP_PASSWORD,
    secure: rawEnv.SMTP_SECURE,
    from: rawEnv.SMTP_FROM,
  }),
  cronTimezone: rawEnv.CRON_TIMEZONE,
  enableCronJobs: rawEnv.ENABLE_CRON_JOBS,
});
