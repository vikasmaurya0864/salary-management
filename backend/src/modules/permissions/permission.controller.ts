import type { FastifyReply, FastifyRequest } from "fastify";
import {
  bulkCreatePermissionByRoleSchema,
  createPermissionSchema,
  listPermissionsQuerySchema,
  updatePermissionSchema,
} from "./permission.validation";
import * as permissionService from "./permission.service";
import { sendValidationError } from "../../utils/validation";
import { successResponse } from "../../utils/response";
import { scopedLogger } from "../../utils/scoped-logger";
import type { IdParams } from "../../types/route.types";

const LAYER = "PermissionController";

export async function createPermissionHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "createPermissionHandler");
  log.info("Create permission - request received");

  const parsed = createPermissionSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const permission = await permissionService.createPermission(log, parsed.data);
  log.info({ id: permission.id }, "Create permission - request completed");
  return reply.status(201).send(successResponse(permission));
}

export async function bulkCreatePermissionsByRoleHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "bulkCreatePermissionsByRoleHandler");
  log.info("Bulk create permissions by role - request received");

  const parsed = bulkCreatePermissionByRoleSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const result = await permissionService.createPermissionsForRole(log, parsed.data);
  log.info({ role: result.role, created: result.created }, "Bulk create permissions by role - request completed");
  return reply.status(201).send(successResponse(result));
}

export async function listPermissionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "listPermissionsHandler");
  log.info("List permissions - request received");

  const parsed = listPermissionsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const result = await permissionService.listPermissions(log, parsed.data);
  log.info({ total: result.pagination.total }, "List permissions - request completed");
  return reply.send(successResponse(result));
}

export async function getPermissionHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "getPermissionHandler");
  log.info({ id: request.params.id }, "Get permission - request received");

  const permission = await permissionService.getPermissionById(log, request.params.id);

  log.info({ id: request.params.id }, "Get permission - request completed");
  return reply.send(successResponse(permission));
}

export async function updatePermissionHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "updatePermissionHandler");
  log.info({ id: request.params.id }, "Update permission - request received");

  const parsed = updatePermissionSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const permission = await permissionService.updatePermission(log, request.params.id, parsed.data);

  log.info({ id: request.params.id }, "Update permission - request completed");
  return reply.send(successResponse(permission));
}

export async function deletePermissionHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "deletePermissionHandler");
  log.info({ id: request.params.id }, "Delete permission - request received");

  await permissionService.deletePermission(log, request.params.id);

  log.info({ id: request.params.id }, "Delete permission - request completed");
  return reply.status(204).send();
}
