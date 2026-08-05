import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env";
import type { ErrorResponseBody } from "./error-handler";

const API_KEY_HEADER = "x-api-key";
const expectedKeyBuffer = Buffer.from(env.apiKey);

/**
 * Constant-time string comparison to avoid leaking information about how
 * many leading characters of the API key were guessed correctly via
 * response-time differences.
 */
function isValidApiKey(candidate: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  if (candidateBuffer.length !== expectedKeyBuffer.length) {
    return false;
  }
  return timingSafeEqual(candidateBuffer, expectedKeyBuffer);
}

function sendUnauthorized(reply: FastifyReply, message: string): void {
  const body: ErrorResponseBody = {
    success: false,
    error: {
      message,
      code: "UNAUTHORIZED",
      statusCode: 401,
    },
  };
  void reply.status(401).send(body);
}

/**
 * Registers an `onRequest` hook that runs before every route handler in
 * whatever scope it's registered in (see `src/routes/api/index.ts`, where
 * it's applied to the whole `/api` prefix). Acts as a gate that verifies
 * the caller is a legitimate client (the UI) before any route logic runs.
 *
 * This is intentionally separate from JWT auth: this checks "is this a
 * trusted client app", JWT checks "which user is making the request".
 */
export function registerApiKeyGuard(app: FastifyInstance): void {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const providedKey = request.headers[API_KEY_HEADER];

    if (!providedKey || Array.isArray(providedKey)) {
      request.log.warn({ url: request.url }, "Request missing X-API-Key header");
      sendUnauthorized(reply, `Missing required '${API_KEY_HEADER}' header`);
      return;
    }

    if (!isValidApiKey(providedKey)) {
      request.log.warn({ url: request.url }, "Request sent an invalid X-API-Key");
      sendUnauthorized(reply, "Invalid API key");
      return;
    }
  });
}
