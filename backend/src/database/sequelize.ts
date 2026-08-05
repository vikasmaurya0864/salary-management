import { Sequelize } from "sequelize";
import { env } from "../config/env";
import type { Logger } from "../utils/logger";

/**
 * The single Sequelize connection instance used by the running app (models,
 * queries, transactions). Kept separate from `src/database/config/config.cjs`,
 * which `sequelize-cli` uses standalone for migrations/seeders.
 */
export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: "postgres",
  dialectOptions: env.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  // We rely on our own request/startup logging; Sequelize's per-query SQL
  // logging is noisy by default and better opted into per-debugging-session.
  logging: false,
});

// If the DB is briefly unreachable at boot (e.g. Postgres still starting up
// alongside the app, a container restart, a transient network blip), retry
// a handful of times before giving up rather than failing on the first try.
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_RETRY_DELAY_MS = 60_000; // 1 minute

export interface ConnectDatabaseOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifies the database is reachable before the app starts serving traffic,
 * retrying on failure with a fixed delay between attempts. Fails fast (after
 * exhausting retries) with a clear log message rather than surfacing a
 * confusing error on the first query a request happens to trigger.
 */
export async function connectDatabase(logger: Logger, options: ConnectDatabaseOptions = {}): Promise<void> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  logger.info({ host: env.db.host, port: env.db.port, database: env.db.name }, "Connecting to PostgreSQL...");

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sequelize.authenticate();
      logger.info({ attempt }, "PostgreSQL connection established successfully");
      return;
    } catch (error) {
      const attemptsLeft = maxAttempts - attempt;

      if (attemptsLeft <= 0) {
        logger.error(
          { err: error, attempt, maxAttempts },
          "Unable to connect to PostgreSQL. No attempts left, giving up."
        );
        throw error;
      }

      logger.error(
        { err: error, attempt, maxAttempts, retryInSeconds: retryDelayMs / 1000 },
        `Unable to connect to PostgreSQL (attempt ${attempt}/${maxAttempts}). Retrying in ${retryDelayMs / 1000}s...`
      );

      await sleep(retryDelayMs);
    }
  }
}
