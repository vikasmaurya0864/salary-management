import type { FastifyInstance } from "fastify";
import { loginSchema, refreshTokenSchema, registerSchema } from "./auth.validation";
import { authenticateUser, createAuthSession, refreshAuthSession, registerUser } from "./auth.service";
import { successResponse } from "../../utils/response";
import { sendValidationError } from "../../utils/validation";
import { scopedLogger } from "../../utils/scoped-logger";
import type { ErrorResponseBody } from "../../plugins/error-handler";

const LAYER = "AuthController";

function sessionResponse(session: Awaited<ReturnType<typeof createAuthSession>>) {
  return {
    accessToken: session.accessToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    user: session.user.toJSON(),
  };
}

/**
 * Auth routes sit behind the `/api` X-API-Key guard but are intentionally
 * NOT behind JWT / permission checks — login, register, and refresh are how
 * a client obtains (or renews) those tokens in the first place.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", async (request, reply) => {
    const log = scopedLogger(request.log, LAYER, "loginHandler");
    log.info("Login - request received");

    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const result = await authenticateUser(log, parsed.data);

    if (!result) {
      log.warn("Login - request rejected, invalid credentials");
      const body: ErrorResponseBody = {
        success: false,
        error: {
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
          statusCode: 401,
        },
      };
      return reply.status(401).send(body);
    }

    const session = await createAuthSession(log, app, result.user, result.roleName);

    log.info({ userId: result.user.id, role: result.roleName }, "Login - request completed");
    return reply.send(successResponse(sessionResponse(session)));
  });

  // Public self-registration — always creates an EMPLOYEE (see
  // `registerUser`/`registerSchema`); still behind the `/api` X-API-Key guard.
  app.post("/register", async (request, reply) => {
    const log = scopedLogger(request.log, LAYER, "registerHandler");
    log.info("Register - request received");

    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const { user, roleName } = await registerUser(log, parsed.data);
    const session = await createAuthSession(log, app, user, roleName);

    log.info({ userId: user.id }, "Register - request completed");
    return reply.status(201).send(successResponse(sessionResponse(session)));
  });

  // Exchange a valid refresh token for a new access JWT (+ rotated refresh).
  // API-key only — no JWT required (that's the whole point when access expired).
  app.post("/refresh", async (request, reply) => {
    const log = scopedLogger(request.log, LAYER, "refreshHandler");
    log.info("Refresh - request received");

    const parsed = refreshTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const session = await refreshAuthSession(log, app, parsed.data);

    log.info({ userId: session.user.id }, "Refresh - request completed");
    return reply.send(successResponse(sessionResponse(session)));
  });
}
