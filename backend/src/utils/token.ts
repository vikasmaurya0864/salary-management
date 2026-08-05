import type { FastifyInstance } from "fastify";
import type { AuthUser } from "../plugins/jwt";

export type AuthTokenPayload = AuthUser;

export interface IssuedToken {
  token: string;
  /**
   * Always `null`: tokens are signed without an `expiresIn`, so they carry
   * no `exp` claim and never expire. Kept as an explicit field (rather than
   * omitted) so API responses/consumers don't have to guess whether
   * expiry was left out by mistake.
   */
  expiresAt: null;
}

/**
 * Signs a JWT for the given payload with no expiration.
 * Requires the `jwt` plugin (`src/plugins/jwt.ts`) to already be registered
 * on the passed Fastify instance.
 */
export function issueAuthToken(app: FastifyInstance, payload: AuthTokenPayload): IssuedToken {
  const token = app.jwt.sign(payload);
  return { token, expiresAt: null };
}
