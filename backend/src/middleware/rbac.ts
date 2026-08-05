import type { FastifyRequest, FastifyReply } from "fastify";
import type { RoleName } from "../constants/roles";
import type { ErrorResponseBody } from "../plugins/error-handler";

/**
 * `preHandler` factory restricting a route to specific roles. Must run
 * *after* `app.authenticate` (which populates `request.user`), e.g.:
 *   app.post("/users", { preHandler: [app.authenticate, requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR)] }, handler)
 *
 * This only checks coarse-grained "can this role hit this route at all".
 * Fine-grained rules (e.g. "HR can only manage EMPLOYEE records") are
 * enforced inside the relevant service/controller, where the target
 * resource is known.
 */
export function requireRole(...allowedRoles: RoleName[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userRole = request.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      request.log.warn({ userRole, allowedRoles, url: request.url }, "Role not permitted for this route");

      const body: ErrorResponseBody = {
        success: false,
        error: {
          message: "You do not have permission to perform this action",
          code: "FORBIDDEN",
          statusCode: 403,
        },
      };
      void reply.status(403).send(body);
    }
  };
}
