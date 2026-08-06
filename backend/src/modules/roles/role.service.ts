import type { Role } from "../../models";
import * as roleRepository from "../../repositories/role.repository";
import { AppError, ConflictError, NotFoundError } from "../../utils/app-error";
import type { Logger } from "../../utils/logger";
import { scopedLogger } from "../../utils/scoped-logger";
import type { CreateRoleInput, UpdateRoleInput } from "./role.validation";

const LAYER = "RoleService";

export async function createRole(logger: Logger, input: CreateRoleInput): Promise<Role> {
  const log = scopedLogger(logger, LAYER, "createRole");
  log.info({ name: input.name }, "Create role - processing");

  const existing = await roleRepository.findByName(log, input.name);
  if (existing) {
    log.warn({ name: input.name }, "Create role - name already in use");
    throw new ConflictError(`A role named '${input.name}' already exists`);
  }

  const role = await roleRepository.create(log, { name: input.name, description: input.description ?? null });

  log.info({ id: role.id }, "Create role - completed");
  return role;
}

export async function listRoles(logger: Logger): Promise<Role[]> {
  const log = scopedLogger(logger, LAYER, "listRoles");
  log.info("List roles - processing");

  const roles = await roleRepository.findAll(log);

  log.info({ count: roles.length }, "List roles - completed");
  return roles;
}

async function findRoleOrThrow(logger: Logger, id: string): Promise<Role> {
  const role = await roleRepository.findById(logger, id);
  if (!role) {
    throw new NotFoundError("Role not found");
  }
  return role;
}

export async function getRoleById(logger: Logger, id: string): Promise<Role> {
  const log = scopedLogger(logger, LAYER, "getRoleById");
  log.info({ id }, "Get role - processing");

  const role = await findRoleOrThrow(log, id);

  log.info({ id }, "Get role - completed");
  return role;
}

export async function updateRole(logger: Logger, id: string, input: UpdateRoleInput): Promise<Role> {
  const log = scopedLogger(logger, LAYER, "updateRole");
  log.info({ id }, "Update role - processing");

  const role = await findRoleOrThrow(log, id);

  if (input.name && input.name !== role.name) {
    const existing = await roleRepository.findByName(log, input.name);
    if (existing) {
      log.warn({ name: input.name }, "Update role - name already in use");
      throw new ConflictError(`A role named '${input.name}' already exists`);
    }
    role.name = input.name;
  }

  if (input.description !== undefined) {
    role.description = input.description;
  }

  await roleRepository.save(log, role);

  log.info({ id }, "Update role - completed");
  return role;
}

export async function deleteRole(logger: Logger, id: string): Promise<void> {
  const log = scopedLogger(logger, LAYER, "deleteRole");
  log.info({ id }, "Delete role - processing");

  const role = await findRoleOrThrow(log, id);

  const usersWithRole = await roleRepository.countUsersWithRole(log, role.id);
  if (usersWithRole > 0) {
    log.warn({ id, usersWithRole }, "Delete role - role still in use, blocking delete");
    throw new AppError(
      `Cannot delete role '${role.name}': ${usersWithRole} user(s) are still assigned to it`,
      409,
      "ROLE_IN_USE"
    );
  }

  await roleRepository.softDelete(log, role);
  log.info({ id }, "Delete role - completed");
}
