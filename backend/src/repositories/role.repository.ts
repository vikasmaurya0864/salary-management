import { Role, User } from "../models";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "RoleRepository";

export interface CreateRoleRow {
  name: string;
  description: string | null;
}

export async function findByName(logger: Logger, name: string): Promise<Role | null> {
  const log = scopedLogger(logger, LAYER, "findByName");
  log.info({ name }, "Find role by name - querying database");
  const role = await Role.findOne({ where: { name } });
  log.info({ name, found: Boolean(role) }, "Find role by name - completed");
  return role;
}

export async function findById(logger: Logger, id: string): Promise<Role | null> {
  const log = scopedLogger(logger, LAYER, "findById");
  log.info({ id }, "Find role by id - querying database");
  const role = await Role.findByPk(id);
  log.info({ id, found: Boolean(role) }, "Find role by id - completed");
  return role;
}

export async function findAll(logger: Logger): Promise<Role[]> {
  const log = scopedLogger(logger, LAYER, "findAll");
  log.info("List roles - querying database");
  const roles = await Role.findAll({ order: [["name", "ASC"]] });
  log.info({ count: roles.length }, "List roles - query completed");
  return roles;
}

export async function create(logger: Logger, data: CreateRoleRow): Promise<Role> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info({ name: data.name }, "Create role - inserting into database");
  const role = await Role.create(data);
  log.info({ id: role.id }, "Create role - insert completed");
  return role;
}

export async function save(logger: Logger, role: Role): Promise<Role> {
  const log = scopedLogger(logger, LAYER, "save");
  log.info({ id: role.id }, "Save role - persisting changes");
  await role.save();
  log.info({ id: role.id }, "Save role - changes persisted");
  return role;
}

export async function softDelete(logger: Logger, role: Role): Promise<void> {
  const log = scopedLogger(logger, LAYER, "softDelete");
  log.info({ id: role.id }, "Delete role - soft deleting");
  await role.destroy();
  log.info({ id: role.id }, "Delete role - soft delete completed");
}

export async function countUsersWithRole(logger: Logger, roleId: string): Promise<number> {
  const log = scopedLogger(logger, LAYER, "countUsersWithRole");
  log.info({ roleId }, "Count users with role - querying database");
  const count = await User.count({ where: { roleId } });
  log.info({ roleId, count }, "Count users with role - completed");
  return count;
}
