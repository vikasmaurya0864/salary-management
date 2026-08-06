import Redis from "ioredis";
import { env } from "../config/env";
import type { Logger } from "../utils/logger";

/**
 * Single Redis connection used for the GET-response cache (see
 * `src/utils/cache.ts`). Deliberately treated as a "best effort" dependency,
 * not a hard one like Postgres: every cache read/write is wrapped in
 * try/catch at the call site, so if Redis is slow, down, or misconfigured
 * the app keeps serving correct responses straight from the database —
 * it just runs without the speedup until Redis recovers.
 */
export const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  db: env.redis.db,
  // Don't let a stuck Redis connection pile up retries per-command forever —
  // fail a single command quickly so `cache.ts` can fall back to the DB.
  maxRetriesPerRequest: 1,
  // Keep trying to reconnect in the background indefinitely, capped delay.
  retryStrategy(attempt: number): number {
    return Math.min(attempt * 500, 10_000);
  },
});

// ioredis emits an 'error' event on every connection failure/retry; without
// a listener, Node treats unhandled 'error' events as fatal. Logging is
// deliberately quiet here (just one line) since retryStrategy above already
// keeps retrying — call sites in `cache.ts` log the actual impact per-request.
let lastErrorLoggedAt = 0;
redis.on("error", (error: Error) => {
  const now = Date.now();
  if (now - lastErrorLoggedAt > 30_000) {
    lastErrorLoggedAt = now;
    // eslint-disable-next-line no-console
    console.warn(`[redis] connection error (will keep retrying in background): ${error.message}`);
  }
});

/**
 * Best-effort connectivity check at boot, purely for a clear startup log
 * line — never blocks or fails server startup. Redis reconnects on its own
 * afterwards (see `retryStrategy` above) if it's briefly unavailable.
 */
export async function checkRedisOnBoot(logger: Logger): Promise<void> {
  logger.info({ host: env.redis.host, port: env.redis.port }, "Connecting to Redis...");
  try {
    await redis.ping();
    logger.info("Redis connection established successfully");
  } catch (error) {
    logger.warn(
      { err: error },
      "Redis unavailable at startup - GET endpoints will bypass the cache and hit the database directly until Redis recovers"
    );
  }
}
