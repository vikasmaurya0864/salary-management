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
  // Connection pool: every model query borrows a connection from this pool
  // instead of opening a brand new TCP/auth handshake each time, and
  // returns it when done. Tune `max` up for higher concurrent DB load.
  pool: {
    max: 10, // max simultaneous connections held open in the pool
    min: 0, // no idle connections kept around when there's no traffic
    acquire: 30_000, // ms to wait for a free connection before erroring
    idle: 10_000, // ms a connection can sit unused before being released
  },
});

// If the DB is unreachable (at boot, or a connection drop later), keep
// retrying indefinitely on a fixed interval by default — e.g. so the app
// recovers on its own if Postgres is briefly restarted — rather than
// crashing the whole process. Pass a finite `maxAttempts` to override.
const DEFAULT_MAX_ATTEMPTS = Infinity;
const DEFAULT_RETRY_DELAY_MS = 5_000; // 5 seconds

export interface ConnectDatabaseOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifies the database is reachable before the app starts serving traffic,
 * retrying on failure with a fixed delay between attempts (by default,
 * indefinitely — see `DEFAULT_MAX_ATTEMPTS`). Only ever waits/retries in
 * response to an actual connection error; a successful attempt returns
 * immediately.
 */
export async function connectDatabase(logger: Logger, options: ConnectDatabaseOptions = {}): Promise<void> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const maxAttemptsLabel = Number.isFinite(maxAttempts) ? String(maxAttempts) : "\u221e";

  logger.info({ host: env.db.host, port: env.db.port, database: env.db.name }, "Connecting to PostgreSQL...");

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sequelize.authenticate();
      logger.info({ attempt }, "PostgreSQL connection established successfully");
      return;
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;

      if (isLastAttempt) {
        logger.error(
          { err: error, attempt, maxAttempts: maxAttemptsLabel },
          "Unable to connect to PostgreSQL. No attempts left, giving up."
        );
        throw error;
      }

      logger.error(
        { err: error, attempt, maxAttempts: maxAttemptsLabel, retryInSeconds: retryDelayMs / 1000 },
        `Unable to connect to PostgreSQL (attempt ${attempt}/${maxAttemptsLabel}). Retrying in ${retryDelayMs / 1000}s...`
      );

      await sleep(retryDelayMs);
    }
  }
}
