import type { FastifyInstance } from "fastify";
import { loginSchema } from "./auth.validation";
import { authenticateUser } from "./auth.service";
import { issueAuthToken } from "../../utils/token";
import { successResponse } from "../../utils/response";
import { sendValidationError } from "../../utils/validation";
import type { ErrorResponseBody } from "../../plugins/error-handler";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const { email, password } = parsed.data;
    const result = await authenticateUser(email, password);

    if (!result) {
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

    request.log.info({ userId: user.id, role: roleName }, "User logged in");

    return reply.send(
      successResponse({
        token,
        expiresAt,
        user: user.toJSON(),
      })
    );
  });
}
