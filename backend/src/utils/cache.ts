import { redis } from "../database/redis";
import { env } from "../config/env";
import type { Logger } from "./logger";
import { scopedLogger } from "./scoped-logger";

const LAYER = "Cache";

/**
 * One namespace per cached entity. Doubles as the `MATCH` prefix used to
 * bulk-invalidate every cached list/get-by-id read for that entity in one
 * shot whenever it's written to (create/update/delete) — see
 * `invalidateNamespace`. Keep these in sync with the modules that use them.
 */
export const CACHE_NAMESPACE = {
  USERS: "cache:users",
  ROLES: "cache:roles",
  PERMISSIONS: "cache:permissions",
  ATTENDANCE: "cache:attendance",
  CORRECTIONS: "cache:corrections",
} as const;
export type CacheNamespace = (typeof CACHE_NAMESPACE)[keyof typeof CACHE_NAMESPACE];

/** Builds a stable cache key from a namespace plus arbitrary parts (ids, page/limit, filters, requester role, ...). */
export function buildCacheKey(namespace: CacheNamespace, ...parts: Array<string | number | undefined | null>): string {
  const suffix = parts.map((part) => (part === undefined || part === null ? "_" : String(part))).join(":");
  return `${namespace}:${suffix}`;
}

async function safeGet(logger: Logger, key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (error) {
    logger.warn({ err: error, key }, "Cache read failed - falling back to the database");
    return null;
  }
}

async function safeSet(logger: Logger, key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch (error) {
    logger.warn({ err: error, key }, "Cache write failed - continuing without caching this result");
  }
}

/**
 * Cache-aside read used by every cached GET/list endpoint: return the cached
 * value for `key` if present, otherwise call `loadFresh`, cache its result
 * for `ttlSeconds`, and return it. Any Redis failure is swallowed and
 * treated as a plain cache miss — callers always still get a correct answer
 * straight from the database, just without the speedup.
 */
export async function withCache<T>(
  logger: Logger,
  key: string,
  loadFresh: () => Promise<T>,
  ttlSeconds: number = env.cache.ttlSeconds
): Promise<T> {
  const log = scopedLogger(logger, LAYER, "withCache");

  const cached = await safeGet(log, key);
  if (cached !== null) {
    log.info({ key }, "Cache hit");
    return JSON.parse(cached) as T;
  }

  log.info({ key }, "Cache miss - loading from database");
  const fresh = await loadFresh();
  await safeSet(log, key, JSON.stringify(fresh), ttlSeconds);
  return fresh;
}

/**
 * Invalidates every cached read under a namespace (every list/get-by-id
 * response for that entity) in one call. Called after any create/update/
 * delete so the *next* GET recomputes fresh data instead of serving stale
 * cache — this is the "refresh cache on next GET call" behavior. Uses SCAN
 * (not KEYS) so it never blocks Redis even with a large keyspace.
 */
export async function invalidateNamespace(logger: Logger, namespace: CacheNamespace): Promise<void> {
  const log = scopedLogger(logger, LAYER, "invalidateNamespace");
  try {
    let cursor = "0";
    let deleted = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${namespace}:*`, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== "0");
    log.info({ namespace, deleted }, "Cache invalidated");
  } catch (error) {
    log.warn(
      { err: error, namespace },
      "Cache invalidation failed - stale entries may briefly persist until their TTL expires"
    );
  }
}
