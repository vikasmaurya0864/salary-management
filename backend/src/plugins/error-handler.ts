import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify";

/**
 * Standard shape returned for every error response so API consumers
 * can rely on a single, predictable error contract.
 */
export interface ErrorResponseBody {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: unknown;
  };
}

function resolveStatusCode(error: FastifyError): number {
  if (typeof error.statusCode === "number") {
    return error.statusCode;
  }
  return 500;
}

function resolveErrorCode(error: FastifyError, statusCode: number): string {
  if (error.code) {
    return error.code;
  }
  if (statusCode === 404) {
    return "NOT_FOUND";
  }
  if (statusCode >= 500) {
    return "INTERNAL_SERVER_ERROR";
  }
  return "BAD_REQUEST";
}

/**
 * Registers Fastify's global `setErrorHandler` and `setNotFoundHandler` hooks
 * so every uncaught error/route-miss in the app returns a consistent JSON body
 * and gets logged with full context.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = resolveStatusCode(error);
    const code = resolveErrorCode(error, statusCode);

    const logPayload = {
      err: error,
      method: request.method,
      url: request.url,
      statusCode,
    };

    if (statusCode >= 500) {
      request.log.error(logPayload, "Unhandled error while processing request");
    } else {
      request.log.warn(logPayload, "Request failed with client error");
    }

    const body: ErrorResponseBody = {
      success: false,
      error: {
        message: statusCode >= 500 ? "Internal Server Error" : error.message,
        code,
        statusCode,
        ...(error.validation ? { details: error.validation } : {}),
      },
    };

    void reply.status(statusCode).send(body);
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    request.log.warn({ method: request.method, url: request.url }, "Route not found");

    const body: ErrorResponseBody = {
      success: false,
      error: {
        message: `Route ${request.method} ${request.url} not found`,
        code: "NOT_FOUND",
        statusCode: 404,
      },
    };

    void reply.status(404).send(body);
  });
}

/**
 * Registers process-level guards for errors that never make it into a Fastify
 * request lifecycle (e.g. thrown inside a timer, or an unhandled promise
 * rejection). Logs the failure then exits so the process manager can restart it.
 */
export function registerProcessErrorHandlers(app: FastifyInstance): void {
  process.on("uncaughtException", (error: Error) => {
    app.log.fatal({ err: error }, "Uncaught exception detected. Shutting down.");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    app.log.fatal({ err: reason }, "Unhandled promise rejection detected. Shutting down.");
    process.exit(1);
  });
}
