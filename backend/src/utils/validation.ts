import type { FastifyReply } from "fastify";
import type { ZodError } from "zod";
import type { ErrorResponseBody } from "../plugins/error-handler";

/**
 * Formats a failed zod `safeParse` result into the app's standard error
 * response shape, listing every invalid field so clients can show
 * field-level errors in one round trip.
 */
export function sendValidationError(reply: FastifyReply, error: ZodError): void {
  const body: ErrorResponseBody = {
    success: false,
    error: {
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      statusCode: 400,
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
  };
  void reply.status(400).send(body);
}
