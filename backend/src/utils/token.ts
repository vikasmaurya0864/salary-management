import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env";
import type { AuthUser } from "../plugins/jwt";

export type AuthTokenPayload = AuthUser;

export interface IssuedAccessToken {
  accessToken: string;
  /** Absolute expiry time of the short-lived access JWT. */
  accessTokenExpiresAt: Date;
}

export interface IssuedRefreshToken {
  /** Opaque plaintext refresh token — returned to the client once; never stored as-is. */
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  /** SHA-256 hex digest persisted in `refresh_tokens.tokenHash`. */
  tokenHash: string;
}

/**
 * Signs a short-lived access JWT (default 15 minutes — see
 * `JWT_ACCESS_TOKEN_TTL_SECONDS`). Requires the `jwt` plugin to already be
 * registered on the passed Fastify instance.
 */
export function issueAccessToken(app: FastifyInstance, payload: AuthTokenPayload): IssuedAccessToken {
  const accessToken = app.jwt.sign(payload, { expiresIn: env.jwtAccessTokenTtlSeconds });
  const accessTokenExpiresAt = new Date(Date.now() + env.jwtAccessTokenTtlSeconds * 1000);
  return { accessToken, accessTokenExpiresAt };
}

/** Cryptographically random opaque refresh token + its hash and absolute expiry. */
export function generateRefreshToken(): IssuedRefreshToken {
  const refreshToken = randomBytes(48).toString("base64url");
  const tokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  return { refreshToken, refreshTokenExpiresAt, tokenHash };
}

export function hashRefreshToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
