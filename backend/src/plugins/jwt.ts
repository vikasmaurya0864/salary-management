import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env";
import type { ErrorResponseBody } from "./error-handler";

declare module "fastify" {
  interface FastifyInstance {
    /**
     * `preHandler` to protect a route with JWT auth, e.g.:
     *   app.get("/me", { preHandler: app.authenticate }, handler)
     * Populates `request.user` with the decoded token payload on success.
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
 * Tokens are signed with no `expiresIn`, so they carry no `exp` claim and
 * never expire — see `signAuthToken` in `src/utils/token.ts`.
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

      const body: ErrorResponseBody = {
        success: false,
        error: {
          message: "Missing or invalid authentication token",
          code: "UNAUTHENTICATED",
          statusCode: 401,
        },
      };
      void reply.status(401).send(body);
    }
  });
});
