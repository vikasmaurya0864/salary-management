import { Role, User } from "../models";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "UserRepository";
const withRole = { include: [{ model: Role, as: "role" as const }] };

export interface CreateUserRow {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mobile: string;
  address: string | null;
  roleId: string;
}

export interface FindUsersOptions {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export async function findByEmail(logger: Logger, email: string): Promise<User | null> {
  const log = scopedLogger(logger, LAYER, "findByEmail");
  log.info({ email }, "Find user by email - querying database");
  const user = await User.findOne({ where: { email }, ...withRole });
  log.info({ email, found: Boolean(user) }, "Find user by email - completed");
  return user;
}

export async function findById(logger: Logger, id: string): Promise<User | null> {
  const log = scopedLogger(logger, LAYER, "findById");
  log.info({ id }, "Find user by id - querying database");
  const user = await User.findByPk(id, withRole);
  log.info({ id, found: Boolean(user) }, "Find user by id - completed");
  return user;
}

export async function create(logger: Logger, data: CreateUserRow): Promise<User> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info({ email: data.email, roleId: data.roleId }, "Create user - inserting into database");
  const user = await User.create(data);
  log.info({ id: user.id }, "Create user - insert completed");
  return user;
}

export async function findAndCountAll(
  logger: Logger,
  options: FindUsersOptions
): Promise<{ rows: User[]; count: number }> {
  const log = scopedLogger(logger, LAYER, "findAndCountAll");
  log.info({ where: options.where, limit: options.limit, offset: options.offset }, "List users - querying database");
  const result = await User.findAndCountAll({
    where: options.where,
    limit: options.limit,
    offset: options.offset,
    include: withRole.include,
    order: [["createdAt", "DESC"]],
  });
  log.info({ count: result.count }, "List users - query completed");
  return result;
}

export async function save(logger: Logger, user: User): Promise<User> {
  const log = scopedLogger(logger, LAYER, "save");
  log.info({ id: user.id }, "Save user - persisting changes");
  await user.save();
  log.info({ id: user.id }, "Save user - changes persisted");
  return user;
}

export async function reloadWithRole(logger: Logger, user: User): Promise<User> {
  const log = scopedLogger(logger, LAYER, "reloadWithRole");
  log.info({ id: user.id }, "Reload user - refetching with role");
  await user.reload(withRole);
  log.info({ id: user.id }, "Reload user - completed");
  return user;
}

/**
 * All non-deleted ("active") users, regardless of role — Sequelize's
 * `paranoid` mode already excludes soft-deleted rows by default, so this is
 * just a plain `findAll`. Used by the attendance cron jobs, which need to
 * check/notify every current user, not just one requester's own records.
 */
export async function findAllActive(logger: Logger): Promise<User[]> {
  const log = scopedLogger(logger, LAYER, "findAllActive");
  log.info("Find all active users - querying database");
  const users = await User.findAll({ ...withRole });
  log.info({ count: users.length }, "Find all active users - completed");
  return users;
}

/** Returns just the ids of users with a given role — used to scope other resources (e.g. attendance) by role without loading full user records. */
export async function findIdsByRoleId(logger: Logger, roleId: string): Promise<string[]> {
  const log = scopedLogger(logger, LAYER, "findIdsByRoleId");
  log.info({ roleId }, "Find user ids by role - querying database");
  const users = await User.findAll({ where: { roleId }, attributes: ["id"] });
  const ids = users.map((user) => user.id);
  log.info({ roleId, count: ids.length }, "Find user ids by role - completed");
  return ids;
}

export async function softDelete(logger: Logger, user: User): Promise<void> {
  const log = scopedLogger(logger, LAYER, "softDelete");
  log.info({ id: user.id }, "Delete user - soft deleting");
  await user.destroy();
  log.info({ id: user.id }, "Delete user - soft delete completed");
}
