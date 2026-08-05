import type { FastifyInstance } from "fastify";
import { registerApiKeyGuard } from "../../plugins/api-key-guard";
import { successResponse } from "../../utils/response";

/**
 * Root plugin for every `/api/*` route. Registered in `app.ts` with
 * `{ prefix: "/api" }`.
 *
 * `registerApiKeyGuard` adds an `onRequest` hook scoped to this plugin's
 * encapsulation context, so it runs before every route nested under `/api`
 * (including any new route modules registered below) without affecting
 * routes registered outside this plugin, like the public `/health` check.
 *
 * Add new feature route modules here as the app grows, e.g.:
 *   void app.register(employeeRoutes, { prefix: "/employees" });
 *   void app.register(salaryRoutes, { prefix: "/salary" });
 */
export async function apiRoutes(app: FastifyInstance): Promise<void> {
  registerApiKeyGuard(app);

  // Simple example/smoke-test route proving the API key guard runs first.
  // Safe to remove once real feature routes exist under /api.
  app.get("/ping", async () => {
    return successResponse({ message: "pong" });
  });
}
