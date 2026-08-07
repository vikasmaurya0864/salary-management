import type { FastifyReply, FastifyRequest } from "fastify";
import { allocateRoleSchema, createUserSchema, listUsersQuerySchema, updateUserSchema } from "./user.validation";
import * as userService from "./user.service";
import { presentUser } from "../../utils/present-user";
import { sendValidationError } from "../../utils/validation";
import { successResponse } from "../../utils/response";
import { scopedLogger } from "../../utils/scoped-logger";
import type { IdParams } from "../../types/route.types";

const LAYER = "UserController";

export async function createUserHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "createUserHandler");
  log.info("Create user - request received");

  const parsed = createUserSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const user = await userService.createUser(log, request.user.role, parsed.data);
  log.info({ id: user.id }, "Create user - request completed");
  return reply.status(201).send(successResponse(presentUser(user)));
}

export async function listUsersHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "listUsersHandler");
  log.info("List users - request received");

  const parsed = listUsersQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const result = await userService.listUsers(log, { role: request.user.role }, parsed.data);
  log.info({ total: result.pagination.total }, "List users - request completed");
  return reply.send(
    successResponse({
      items: result.items.map((user) => presentUser(user)),
      pagination: result.pagination,
    })
  );
}

export async function getUserStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "getUserStatsHandler");
  log.info("Get user stats - request received");

  const stats = await userService.getUserStats(log, { role: request.user.role });

  log.info({ totalActive: stats.totalActive, totalInactive: stats.totalInactive }, "Get user stats - request completed");
  return reply.send(successResponse(stats));
}

export async function getUserHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "getUserHandler");
  log.info({ id: request.params.id }, "Get user - request received");

  const user = await userService.getUserById(
    log,
    { userId: request.user.userId, role: request.user.role },
    request.params.id
  );

  log.info({ id: request.params.id }, "Get user - request completed");
  return reply.send(successResponse(presentUser(user)));
}

export async function updateUserHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "updateUserHandler");
  log.info({ id: request.params.id }, "Update user - request received");

  const parsed = updateUserSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const user = await userService.updateUser(
    log,
    { userId: request.user.userId, role: request.user.role },
    request.params.id,
    parsed.data
  );

  log.info({ id: request.params.id }, "Update user - request completed");
  return reply.send(successResponse(presentUser(user)));
}

export async function allocateRoleHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "allocateRoleHandler");
  log.info({ id: request.params.id }, "Allocate role - request received");

  const parsed = allocateRoleSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const user = await userService.allocateRole(
    log,
    { userId: request.user.userId, role: request.user.role },
    request.params.id,
    parsed.data
  );

  log.info({ id: request.params.id, newRole: parsed.data.role }, "Allocate role - request completed");
  return reply.send(successResponse(presentUser(user)));
}

export async function deleteUserHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "deleteUserHandler");
  log.info({ id: request.params.id }, "Delete user - request received");

  await userService.deleteUser(log, { userId: request.user.userId, role: request.user.role }, request.params.id);

  log.info({ id: request.params.id }, "Delete user - request completed");
  return reply.status(204).send();
}
