import type { FastifyInstance } from "fastify";
import { registerApiKeyGuard } from "../../plugins/api-key-guard";
import { authRoutes } from "../../modules/auth/auth.routes";
import { userRoutes } from "../../modules/users/user.routes";
import { roleRoutes } from "../../modules/roles/role.routes";
import { permissionRoutes } from "../../modules/permissions/permission.routes";
import { attendanceRoutes } from "../../modules/attendance/attendance.routes";
import { salaryRoutes } from "../../modules/salaries/salary.routes";

/**
 * Root plugin for every `/api/*` route. Registered in `app.ts` with
 * `{ prefix: "/api" }`.
 *
 * `registerApiKeyGuard` adds an `onRequest` hook scoped to this plugin's
 * encapsulation context, so it runs before every route nested under `/api`
 * (including every module registered below) without affecting routes
 * registered outside this plugin, like the public `/health` check.
 */
export async function apiRoutes(app: FastifyInstance): Promise<void> {
  registerApiKeyGuard(app);

  void app.register(authRoutes, { prefix: "/auth" });
  void app.register(userRoutes, { prefix: "/users" });
  void app.register(roleRoutes, { prefix: "/roles" });
  void app.register(permissionRoutes, { prefix: "/permissions" });
  void app.register(attendanceRoutes, { prefix: "/attendance" });
  void app.register(salaryRoutes, { prefix: "/salaries" });
}
