import type { FastifyRequest, FastifyReply } from "fastify";
import { ROLE_NAMES } from "../constants/roles";
import type { HttpMethod } from "../constants/permission";
import * as permissionService from "../modules/permissions/permission.service";
import { scopedLogger } from "../utils/scoped-logger";
import type { ErrorResponseBody } from "../plugins/error-handler";

const LAYER = "PermissionGuard";

/**
 * Fine-grained, data-driven access control on top of `app.authenticate` +
 * `requireRole`: for every request, checks the `permissions` table for an
 * ACTIVE grant matching (current user, route pattern, HTTP method).
 *
 * Must run AFTER `app.authenticate` (needs `request.user`). ADMIN always
 * bypasses this check — otherwise the bootstrap admin (or anyone) would be
 * locked out of the entire API the moment this guard is added, since no
 * grants exist until an admin creates them. Register per-module, e.g.:
 *   app.addHook("preHandler", app.authenticate);
 *   app.addHook("preHandler", checkPermission);
 */
export async function checkPermission(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const log = scopedLogger(request.log, LAYER, "checkPermission");

  if (request.user.role === ROLE_NAMES.ADMIN) {
    log.info({ userId: request.user.userId }, "Check permission - admin bypass");
    return;
  }

  // Registered route pattern (e.g. "/api/users/:id"), NOT the resolved URL
  // with real ids — see `Permission` model for why that distinction matters.
  // Falls back to the raw URL in the (practically unreachable) case Fastify
  // hasn't resolved a route pattern for this request.
  const path = request.routeOptions.url ?? request.url;
  const method = request.method as HttpMethod;

  const allowed = await permissionService.hasAccess(log, request.user.userId, path, method);
  if (allowed) {
    log.info({ userId: request.user.userId, path, method }, "Check permission - granted");
    return;
  }

  log.warn({ userId: request.user.userId, path, method }, "Check permission - denied, no active grant");
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
