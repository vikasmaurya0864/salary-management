import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env";
import type { RoleName } from "../constants/roles";
import type { ErrorResponseBody } from "./error-handler";

/** Shape of the data embedded in every issued JWT (see `src/utils/token.ts`). */
export interface AuthUser {
  userId: string;
  role: RoleName;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /**
     * `preHandler` to protect a route with JWT auth, e.g.:
     *   app.get("/me", { preHandler: app.authenticate }, handler)
     * Populates `request.user` (typed as `AuthUser`) with the decoded token
     * payload on success.
     */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Registers `@fastify/jwt` and an `authenticate` preHandler decorator.
 *
 * Wrapped with `fastify-plugin` so the `authenticate` decorator and the
 * `request.jwtVerify()` / `reply.jwtSign()` helpers it enables are visible
 * to every route in the app, not just this plugin's own encapsulation
 * context (Fastify plugins are encapsulated by default).
 *
 * Access tokens are short-lived (see `JWT_ACCESS_TOKEN_TTL_SECONDS` /
 * `issueAccessToken`). When they expire, clients call POST /api/auth/refresh
 * with a stored refresh token rather than forcing a full login.
 */
export default fp(async function jwtPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: env.jwtSecret,
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      request.log.warn({ err: error, url: request.url }, "JWT verification failed");

      // @fastify/jwt wraps fast-jwt's expired error as FST_JWT_AUTHORIZATION_TOKEN_EXPIRED.
      const isExpired =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED";

      const body: ErrorResponseBody = {
        success: false,
        error: {
          message: isExpired
            ? "Access token has expired. Use the refresh token endpoint to get a new one."
            : "Missing or invalid authentication token",
          code: isExpired ? "TOKEN_EXPIRED" : "UNAUTHENTICATED",
          statusCode: 401,
        },
      };
      void reply.status(401).send(body);
    }
  });
});
