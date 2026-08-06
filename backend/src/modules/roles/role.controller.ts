import type { FastifyReply, FastifyRequest } from "fastify";
import { createRoleSchema, updateRoleSchema } from "./role.validation";
import * as roleService from "./role.service";
import { sendValidationError } from "../../utils/validation";
import { successResponse } from "../../utils/response";
import { scopedLogger } from "../../utils/scoped-logger";
import type { IdParams } from "../../types/route.types";

const LAYER = "RoleController";

export async function createRoleHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "createRoleHandler");
  log.info("Create role - request received");

  const parsed = createRoleSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const role = await roleService.createRole(log, parsed.data);
  log.info({ id: role.id }, "Create role - request completed");
  return reply.status(201).send(successResponse(role));
}

export async function listRolesHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "listRolesHandler");
  log.info("List roles - request received");

  const roles = await roleService.listRoles(log);

  log.info({ count: roles.length }, "List roles - request completed");
  return reply.send(successResponse(roles));
}

export async function getRoleHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "getRoleHandler");
  log.info({ id: request.params.id }, "Get role - request received");

  const role = await roleService.getRoleById(log, request.params.id);

  log.info({ id: request.params.id }, "Get role - request completed");
  return reply.send(successResponse(role));
}

export async function updateRoleHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "updateRoleHandler");
  log.info({ id: request.params.id }, "Update role - request received");

  const parsed = updateRoleSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const role = await roleService.updateRole(log, request.params.id, parsed.data);

  log.info({ id: request.params.id }, "Update role - request completed");
  return reply.send(successResponse(role));
}

export async function deleteRoleHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "deleteRoleHandler");
  log.info({ id: request.params.id }, "Delete role - request received");

  await roleService.deleteRole(log, request.params.id);

  log.info({ id: request.params.id }, "Delete role - request completed");
  return reply.status(204).send();
}
