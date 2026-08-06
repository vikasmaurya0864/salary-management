import type { FastifyInstance } from "fastify";
import { loginSchema, registerSchema } from "./auth.validation";
import { authenticateUser, registerUser } from "./auth.service";
import { issueAuthToken } from "../../utils/token";
import { successResponse } from "../../utils/response";
import { sendValidationError } from "../../utils/validation";
import { scopedLogger } from "../../utils/scoped-logger";
import type { ErrorResponseBody } from "../../plugins/error-handler";

const LAYER = "AuthController";

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

    const { user, roleName } = result;
    const { token, expiresAt } = issueAuthToken(app, { userId: user.id, role: roleName });

    log.info({ userId: user.id, role: roleName }, "Login - request completed");
    return reply.send(successResponse({ token, expiresAt, user: user.toJSON() }));
  });

  // Public self-registration — no `app.authenticate` on this route. Always
  // creates an EMPLOYEE (see `registerUser`/`registerSchema`); still behind
  // the `/api` X-API-Key guard applied one level up.
  app.post("/register", async (request, reply) => {
    const log = scopedLogger(request.log, LAYER, "registerHandler");
    log.info("Register - request received");

    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const { user, roleName } = await registerUser(log, parsed.data);
    const { token, expiresAt } = issueAuthToken(app, { userId: user.id, role: roleName });

    log.info({ userId: user.id, role: roleName }, "Register - request completed");
    return reply.status(201).send(successResponse({ token, expiresAt, user: user.toJSON() }));
  });
}
