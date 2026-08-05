import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/rbac";
import { ROLE_NAMES } from "../../constants/roles";
import type { IdParams } from "../../types/route.types";
import {
  createRoleHandler,
  deleteRoleHandler,
  getRoleHandler,
  listRolesHandler,
  updateRoleHandler,
} from "./role.controller";

/**
 * Role management is deliberately admin-only for mutations; HR can read
 * the list (e.g. to populate a dropdown) but never create/edit/delete
 * roles, keeping the 3-tier hierarchy (Admin > HR > Employee) intact.
 */
export async function roleRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.post("/", { preHandler: requireRole(ROLE_NAMES.ADMIN) }, createRoleHandler);
  app.get("/", { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR) }, listRolesHandler);
  app.get<{ Params: IdParams }>("/:id", { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR) }, getRoleHandler);
  app.put<{ Params: IdParams }>("/:id", { preHandler: requireRole(ROLE_NAMES.ADMIN) }, updateRoleHandler);
  app.delete<{ Params: IdParams }>("/:id", { preHandler: requireRole(ROLE_NAMES.ADMIN) }, deleteRoleHandler);
}
