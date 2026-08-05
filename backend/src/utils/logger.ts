import type { FastifyBaseLogger } from "fastify";
import type { PinoLoggerOptions } from "fastify/types/logger";
import { env } from "../config/env";

/**
 * Logger options passed to Fastify's built-in pino logger.
 * Pretty-prints logs in development; structured JSON in production.
 */
export const loggerOptions: PinoLoggerOptions | boolean = {
  level: env.logLevel,
  transport: env.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
};

export type Logger = FastifyBaseLogger;
