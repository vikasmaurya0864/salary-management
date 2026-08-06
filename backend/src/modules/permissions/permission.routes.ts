import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/rbac";
import { checkPermission } from "../../middleware/permission-guard";
import { ROLE_NAMES } from "../../constants/roles";
import type { IdParams } from "../../types/route.types";
import {
  createPermissionHandler,
  deletePermissionHandler,
  getPermissionHandler,
  listPermissionsHandler,
  updatePermissionHandler,
} from "./permission.controller";

/**
 * Permission management is admin-only, same reasoning as roles: keeps the
 * 3-tier hierarchy (Admin > HR > Employee) as the single source of truth
 * for who can configure access control.
 */
export async function permissionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", requireRole(ROLE_NAMES.ADMIN));
  app.addHook("preHandler", checkPermission);

  app.post("/", createPermissionHandler);
  app.get("/", listPermissionsHandler);
  app.get<{ Params: IdParams }>("/:id", getPermissionHandler);
  app.put<{ Params: IdParams }>("/:id", updatePermissionHandler);
  app.delete<{ Params: IdParams }>("/:id", deletePermissionHandler);
}
