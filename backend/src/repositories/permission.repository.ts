import { Permission, Role, User } from "../models";
import type { HttpMethod, PermissionStatus } from "../constants/permission";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "PermissionRepository";
// Nests the user's role too — the admin UI groups/labels grants by role,
// not just by the individual user they happen to be stored against.
const withUser = {
  include: [{ model: User, as: "user" as const, include: [{ model: Role, as: "role" as const }] }],
};

export interface CreatePermissionRow {
  userId: string;
  path: string;
  method: HttpMethod;
  status: PermissionStatus;
}

export interface FindPermissionsOptions {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

/** The actual access-control lookup used by the `checkPermission` guard on every request. */
export async function findActiveGrant(
  logger: Logger,
  userId: string,
  path: string,
  method: HttpMethod
): Promise<Permission | null> {
  const log = scopedLogger(logger, LAYER, "findActiveGrant");
  log.info({ userId, path, method }, "Find active grant - querying database");
  const permission = await Permission.findOne({ where: { userId, path, method, status: "ACTIVE" } });
  log.info({ userId, path, method, found: Boolean(permission) }, "Find active grant - completed");
  return permission;
}

export async function findByUserPathMethod(
  logger: Logger,
  userId: string,
  path: string,
  method: HttpMethod
): Promise<Permission | null> {
  const log = scopedLogger(logger, LAYER, "findByUserPathMethod");
  log.info({ userId, path, method }, "Find grant by user/path/method - querying database");
  const permission = await Permission.findOne({ where: { userId, path, method } });
  log.info({ userId, path, method, found: Boolean(permission) }, "Find grant by user/path/method - completed");
  return permission;
}

export async function findById(logger: Logger, id: string): Promise<Permission | null> {
  const log = scopedLogger(logger, LAYER, "findById");
  log.info({ id }, "Find permission by id - querying database");
  const permission = await Permission.findByPk(id, withUser);
  log.info({ id, found: Boolean(permission) }, "Find permission by id - completed");
  return permission;
}

export async function create(logger: Logger, data: CreatePermissionRow): Promise<Permission> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info({ userId: data.userId, path: data.path, method: data.method }, "Create permission - inserting into database");
  const permission = await Permission.create(data);
  log.info({ id: permission.id }, "Create permission - insert completed");
  return permission;
}

export async function findAndCountAll(
  logger: Logger,
  options: FindPermissionsOptions
): Promise<{ rows: Permission[]; count: number }> {
  const log = scopedLogger(logger, LAYER, "findAndCountAll");
  log.info({ where: options.where, limit: options.limit, offset: options.offset }, "List permissions - querying database");
  const result = await Permission.findAndCountAll({
    where: options.where,
    limit: options.limit,
    offset: options.offset,
    include: withUser.include,
    order: [["createdAt", "DESC"]],
  });
  log.info({ count: result.count }, "List permissions - query completed");
  return result;
}

export async function save(logger: Logger, permission: Permission): Promise<Permission> {
  const log = scopedLogger(logger, LAYER, "save");
  log.info({ id: permission.id }, "Save permission - persisting changes");
  await permission.save();
  log.info({ id: permission.id }, "Save permission - changes persisted");
  return permission;
}

export async function hardDelete(logger: Logger, permission: Permission): Promise<void> {
  const log = scopedLogger(logger, LAYER, "hardDelete");
  log.info({ id: permission.id }, "Delete permission - removing grant");
  await permission.destroy();
  log.info({ id: permission.id }, "Delete permission - grant removed");
}
