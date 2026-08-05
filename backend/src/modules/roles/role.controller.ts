import type { FastifyReply, FastifyRequest } from "fastify";
import { createRoleSchema, updateRoleSchema } from "./role.validation";
import * as roleService from "./role.service";
import { sendValidationError } from "../../utils/validation";
import { successResponse } from "../../utils/response";
import type { IdParams } from "../../types/route.types";

export async function createRoleHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createRoleSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const role = await roleService.createRole(parsed.data);
  return reply.status(201).send(successResponse(role));
}

export async function listRolesHandler(_request: FastifyRequest, reply: FastifyReply) {
  const roles = await roleService.listRoles();
  return reply.send(successResponse(roles));
}

export async function getRoleHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const role = await roleService.getRoleById(request.params.id);
  return reply.send(successResponse(role));
}

export async function updateRoleHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const parsed = updateRoleSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const role = await roleService.updateRole(request.params.id, parsed.data);
  return reply.send(successResponse(role));
}

export async function deleteRoleHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  await roleService.deleteRole(request.params.id);
  return reply.status(204).send();
}
