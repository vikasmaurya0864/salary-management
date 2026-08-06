import { Permission, Role, User } from "../models";
import type { HttpMethod, PermissionStatus } from "../constants/permission";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "PermissionRepository";
const withRelations = {
  include: [
    { model: Role, as: "role" as const },
    { model: User, as: "creator" as const },
  ],
};

export interface CreatePermissionRow {
  roleId: string;
  createdBy: string;
  path: string;
  method: HttpMethod;
  status: PermissionStatus;
}

export interface FindPermissionsOptions {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

/**
 * The actual access-control lookup used by the `checkPermission` guard on
 * every request: an ACTIVE grant matching the requester's CURRENT role +
 * this route pattern + HTTP method.
 */
export async function findActiveGrant(
  logger: Logger,
  roleId: string,
  path: string,
  method: HttpMethod
): Promise<Permission | null> {
  const log = scopedLogger(logger, LAYER, "findActiveGrant");
  log.info({ roleId, path, method }, "Find active grant - querying database");
  const permission = await Permission.findOne({ where: { roleId, path, method, status: "ACTIVE" } });
  log.info({ roleId, path, method, found: Boolean(permission) }, "Find active grant - completed");
  return permission;
}

export async function findByRolePathMethod(
  logger: Logger,
  roleId: string,
  path: string,
  method: HttpMethod
): Promise<Permission | null> {
  const log = scopedLogger(logger, LAYER, "findByRolePathMethod");
  log.info({ roleId, path, method }, "Find grant by role/path/method - querying database");
  const permission = await Permission.findOne({ where: { roleId, path, method } });
  log.info({ roleId, path, method, found: Boolean(permission) }, "Find grant by role/path/method - completed");
  return permission;
}

export async function findById(logger: Logger, id: string): Promise<Permission | null> {
  const log = scopedLogger(logger, LAYER, "findById");
  log.info({ id }, "Find permission by id - querying database");
  const permission = await Permission.findByPk(id, withRelations);
  log.info({ id, found: Boolean(permission) }, "Find permission by id - completed");
  return permission;
}

export async function create(logger: Logger, data: CreatePermissionRow): Promise<Permission> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info(
    { roleId: data.roleId, createdBy: data.createdBy, path: data.path, method: data.method },
    "Create permission - inserting into database"
  );
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
    include: withRelations.include,
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
