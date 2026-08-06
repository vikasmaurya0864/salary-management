import type { Permission } from "../../models";
import * as permissionRepository from "../../repositories/permission.repository";
import * as userRepository from "../../repositories/user.repository";
import * as roleRepository from "../../repositories/role.repository";
import type { HttpMethod } from "../../constants/permission";
import { ConflictError, NotFoundError } from "../../utils/app-error";
import type { Logger } from "../../utils/logger";
import { scopedLogger } from "../../utils/scoped-logger";
import type {
  BulkCreatePermissionByRoleInput,
  CreatePermissionInput,
  ListPermissionsQuery,
  UpdatePermissionInput,
} from "./permission.validation";

const LAYER = "PermissionService";

export async function createPermission(logger: Logger, input: CreatePermissionInput): Promise<Permission> {
  const log = scopedLogger(logger, LAYER, "createPermission");
  log.info({ userId: input.userId, path: input.path, method: input.method }, "Create permission - processing");

  const user = await userRepository.findById(log, input.userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const existing = await permissionRepository.findByUserPathMethod(log, input.userId, input.path, input.method);
  if (existing) {
    log.warn({ userId: input.userId, path: input.path, method: input.method }, "Create permission - grant already exists");
    throw new ConflictError(`A grant for ${input.method} ${input.path} already exists for this user`);
  }

  const permission = await permissionRepository.create(log, {
    userId: input.userId,
    path: input.path,
    method: input.method,
    status: input.status,
  });

  log.info({ id: permission.id }, "Create permission - completed");
  return permission;
}

export interface BulkCreatePermissionByRoleResult {
  role: string;
  path: string;
  method: HttpMethod;
  totalUsers: number;
  created: number;
  alreadyGranted: number;
}

/**
 * "Select a role, grant a permission" flow: instead of picking one user id
 * at a time, this grants the same path+method to every user currently
 * holding the given role. Users that already have a grant for this exact
 * path+method are left untouched (reported as `alreadyGranted`, not an error).
 */
export async function createPermissionsForRole(
  logger: Logger,
  input: BulkCreatePermissionByRoleInput
): Promise<BulkCreatePermissionByRoleResult> {
  const log = scopedLogger(logger, LAYER, "createPermissionsForRole");
  log.info({ role: input.role, path: input.path, method: input.method }, "Bulk create permissions by role - processing");

  const role = await roleRepository.findByName(log, input.role);
  if (!role) {
    throw new NotFoundError(`Role '${input.role}' not found`);
  }

  const userIds = await userRepository.findIdsByRoleId(log, role.id);

  let created = 0;
  let alreadyGranted = 0;
  for (const userId of userIds) {
    const existing = await permissionRepository.findByUserPathMethod(log, userId, input.path, input.method);
    if (existing) {
      alreadyGranted += 1;
      continue;
    }
    await permissionRepository.create(log, {
      userId,
      path: input.path,
      method: input.method,
      status: input.status,
    });
    created += 1;
  }

  log.info(
    { role: input.role, totalUsers: userIds.length, created, alreadyGranted },
    "Bulk create permissions by role - completed"
  );
  return { role: input.role, path: input.path, method: input.method, totalUsers: userIds.length, created, alreadyGranted };
}

export interface PaginatedPermissions {
  items: Permission[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listPermissions(logger: Logger, query: ListPermissionsQuery): Promise<PaginatedPermissions> {
  const log = scopedLogger(logger, LAYER, "listPermissions");
  log.info({ userId: query.userId, page: query.page }, "List permissions - processing");

  const where: Record<string, unknown> = {};
  if (query.userId) where.userId = query.userId;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await permissionRepository.findAndCountAll(log, { where, limit: query.limit, offset });

  log.info({ total: count }, "List permissions - completed");
  return {
    items: rows,
    pagination: { page: query.page, limit: query.limit, total: count, totalPages: Math.ceil(count / query.limit) || 1 },
  };
}

async function findPermissionOrThrow(logger: Logger, id: string): Promise<Permission> {
  const permission = await permissionRepository.findById(logger, id);
  if (!permission) {
    throw new NotFoundError("Permission not found");
  }
  return permission;
}

export async function getPermissionById(logger: Logger, id: string): Promise<Permission> {
  const log = scopedLogger(logger, LAYER, "getPermissionById");
  log.info({ id }, "Get permission - processing");

  const permission = await findPermissionOrThrow(log, id);

  log.info({ id }, "Get permission - completed");
  return permission;
}

export async function updatePermission(
  logger: Logger,
  id: string,
  input: UpdatePermissionInput
): Promise<Permission> {
  const log = scopedLogger(logger, LAYER, "updatePermission");
  log.info({ id }, "Update permission - processing");

  const permission = await findPermissionOrThrow(log, id);

  const nextPath = input.path ?? permission.path;
  const nextMethod = input.method ?? permission.method;
  if (nextPath !== permission.path || nextMethod !== permission.method) {
    const existing = await permissionRepository.findByUserPathMethod(log, permission.userId, nextPath, nextMethod);
    if (existing && existing.id !== permission.id) {
      log.warn({ id, path: nextPath, method: nextMethod }, "Update permission - grant already exists");
      throw new ConflictError(`A grant for ${nextMethod} ${nextPath} already exists for this user`);
    }
    permission.path = nextPath;
    permission.method = nextMethod;
  }

  if (input.status !== undefined) {
    permission.status = input.status;
  }

  await permissionRepository.save(log, permission);

  log.info({ id }, "Update permission - completed");
  return permission;
}

export async function deletePermission(logger: Logger, id: string): Promise<void> {
  const log = scopedLogger(logger, LAYER, "deletePermission");
  log.info({ id }, "Delete permission - processing");

  const permission = await findPermissionOrThrow(log, id);
  await permissionRepository.hardDelete(log, permission);

  log.info({ id }, "Delete permission - completed");
}

/**
 * The actual access-control decision, called by the `checkPermission`
 * middleware on every guarded request: does this user have an ACTIVE grant
 * for this exact route pattern + HTTP method?
 */
export async function hasAccess(logger: Logger, userId: string, path: string, method: HttpMethod): Promise<boolean> {
  const log = scopedLogger(logger, LAYER, "hasAccess");
  log.info({ userId, path, method }, "Check access - processing");

  const grant = await permissionRepository.findActiveGrant(log, userId, path, method);

  log.info({ userId, path, method, allowed: Boolean(grant) }, "Check access - completed");
  return Boolean(grant);
}
