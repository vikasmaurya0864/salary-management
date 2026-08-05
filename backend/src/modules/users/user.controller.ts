import type { FastifyReply, FastifyRequest } from "fastify";
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from "./user.validation";
import * as userService from "./user.service";
import { sendValidationError } from "../../utils/validation";
import { successResponse } from "../../utils/response";
import type { IdParams } from "../../types/route.types";

export async function createUserHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createUserSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const user = await userService.createUser(request.user.role, parsed.data);
  return reply.status(201).send(successResponse(user.toJSON()));
}

export async function listUsersHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = listUsersQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const result = await userService.listUsers({ role: request.user.role }, parsed.data);
  return reply.send(
    successResponse({
      items: result.items.map((user) => user.toJSON()),
      pagination: result.pagination,
    })
  );
}

export async function getUserHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const user = await userService.getUserById(
    { userId: request.user.userId, role: request.user.role },
    request.params.id
  );
  return reply.send(successResponse(user.toJSON()));
}

export async function updateUserHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const parsed = updateUserSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const user = await userService.updateUser(
    { userId: request.user.userId, role: request.user.role },
    request.params.id,
    parsed.data
  );
  return reply.send(successResponse(user.toJSON()));
}

export async function deleteUserHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  await userService.deleteUser({ userId: request.user.userId, role: request.user.role }, request.params.id);
  return reply.status(204).send();
}
