import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { loggerOptions } from "./utils/logger";
import { registerErrorHandler, registerProcessErrorHandlers } from "./plugins/error-handler";
import jwtPlugin from "./plugins/jwt";
import { healthRoutes } from "./routes/health.route";
import { apiRoutes } from "./routes/api";

/**
 * Builds and configures a Fastify instance without starting it.
 * Kept separate from `server.ts` so it can also be reused by tests
 * (e.g. via `app.inject()`) without binding to a real port.
 */
export function buildApp(): FastifyInstance {
  // Fastify's built-in request logging (enabled by default whenever a
  // logger is configured) already logs each incoming request and its
  // completion, including method, url, statusCode and responseTime.
  const app = fastify({
    logger: loggerOptions,
  });

  // Allow the React frontend (Vite default :5173) to call /api during local
  // development. Tighten origin in production as needed.
  void app.register(cors, {
    origin: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  });

  void app.register(sensible);
  void app.register(jwtPlugin);

  registerErrorHandler(app);
  registerProcessErrorHandlers(app);

  // Public, unauthenticated — must stay reachable for uptime monitors and
  // load balancer health probes without needing the API key.
  void app.register(healthRoutes);

  // Every route nested here requires a valid X-API-Key (see
  // `registerApiKeyGuard` inside `./routes/api`).
  void app.register(apiRoutes, { prefix: "/api" });

  return app;
}
