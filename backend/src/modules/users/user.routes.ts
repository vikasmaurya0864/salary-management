import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/rbac";
import { checkPermission } from "../../middleware/permission-guard";
import { ROLE_NAMES } from "../../constants/roles";
import type { IdParams } from "../../types/route.types";
import {
  allocateRoleHandler,
  createUserHandler,
  deleteUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserHandler,
} from "./user.controller";

/**
 * All routes here require a valid JWT (`app.authenticate`). Coarse role
 * checks (`requireRole`) gate which roles can hit which endpoint at all;
 * fine-grained "can THIS caller touch THIS specific user" rules live in
 * `user.service.ts`, since they depend on the target record.
 */
export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", checkPermission);

  app.post("/", { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR) }, createUserHandler);
  app.get("/", { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR) }, listUsersHandler);
  app.get<{ Params: IdParams }>("/:id", getUserHandler);
  app.put<{ Params: IdParams }>("/:id", updateUserHandler);
  // Dedicated action: Admin allocates the HR (or Employee) role to a user.
  app.patch<{ Params: IdParams }>("/:id/role", { preHandler: requireRole(ROLE_NAMES.ADMIN) }, allocateRoleHandler);
  app.delete<{ Params: IdParams }>(
    "/:id",
    { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR) },
    deleteUserHandler
  );
}
