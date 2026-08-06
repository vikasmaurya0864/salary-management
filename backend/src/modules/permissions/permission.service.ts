import type { Permission } from "../../models";
import * as permissionRepository from "../../repositories/permission.repository";
import * as roleRepository from "../../repositories/role.repository";
import type { HttpMethod } from "../../constants/permission";
import type { RoleName } from "../../constants/roles";
import { ConflictError, NotFoundError } from "../../utils/app-error";
import { buildCacheKey, CACHE_NAMESPACE, invalidateNamespace, withCache } from "../../utils/cache";
import type { Logger } from "../../utils/logger";
import { scopedLogger } from "../../utils/scoped-logger";
import type { CreatePermissionInput, ListPermissionsQuery, UpdatePermissionInput } from "./permission.validation";

const LAYER = "PermissionService";

/**
 * "Select a role, grant a permission" — the only way permissions are
 * created. A single row covers every user CURRENTLY holding that role,
 * plus anyone moved into it later (see `hasAccess`), so there's nothing to
 * fan out per user and nothing to re-grant when someone's role changes.
 *
 * `createdById` is the acting requester's own id, taken from their
 * authenticated session (`request.user.userId`) by the controller — NEVER
 * from the request body — since only Admins can reach this endpoint today
 * (see `permission.routes.ts`), it's effectively always "the admin who
 * granted this".
 */
export async function createPermission(
  logger: Logger,
  input: CreatePermissionInput,
  createdById: string
): Promise<Permission> {
  const log = scopedLogger(logger, LAYER, "createPermission");
  log.info({ role: input.role, path: input.path, method: input.method, createdBy: createdById }, "Create permission - processing");

  const role = await roleRepository.findByName(log, input.role);
  if (!role) {
    throw new NotFoundError(`Role '${input.role}' not found`);
  }

  const existing = await permissionRepository.findByRolePathMethod(log, role.id, input.path, input.method);
  if (existing) {
    log.warn({ role: input.role, path: input.path, method: input.method }, "Create permission - grant already exists");
    throw new ConflictError(`A grant for ${input.method} ${input.path} already exists for role ${input.role}`);
  }

  const permission = await permissionRepository.create(log, {
    roleId: role.id,
    createdBy: createdById,
    path: input.path,
    method: input.method,
    status: input.status,
  });
  await invalidateNamespace(log, CACHE_NAMESPACE.PERMISSIONS);

  log.info({ id: permission.id, role: input.role }, "Create permission - completed");
  return permission;
}

export interface PaginatedPermissions {
  items: Permission[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listPermissions(logger: Logger, query: ListPermissionsQuery): Promise<PaginatedPermissions> {
  const log = scopedLogger(logger, LAYER, "listPermissions");
  log.info({ roleId: query.roleId, page: query.page }, "List permissions - processing");

  const where: Record<string, unknown> = {};
  if (query.roleId) where.roleId = query.roleId;

  const offset = (query.page - 1) * query.limit;
  const cacheKey = buildCacheKey(CACHE_NAMESPACE.PERMISSIONS, "list", query.page, query.limit, query.roleId);
  const { rows, count } = await withCache(log, cacheKey, () =>
    permissionRepository.findAndCountAll(log, { where, limit: query.limit, offset })
  );

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

  // Cached at this public-read layer only — `updatePermission`/`deletePermission`
  // call `findPermissionOrThrow` directly so they always mutate a live row.
  const permission = await withCache(log, buildCacheKey(CACHE_NAMESPACE.PERMISSIONS, "byId", id), () =>
    findPermissionOrThrow(log, id)
  );

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
    const existing = await permissionRepository.findByRolePathMethod(log, permission.roleId, nextPath, nextMethod);
    if (existing && existing.id !== permission.id) {
      log.warn({ id, path: nextPath, method: nextMethod }, "Update permission - grant already exists");
      throw new ConflictError(`A grant for ${nextMethod} ${nextPath} already exists for this role`);
    }
    permission.path = nextPath;
    permission.method = nextMethod;
  }

  if (input.status !== undefined) {
    permission.status = input.status;
  }

  await permissionRepository.save(log, permission);
  await invalidateNamespace(log, CACHE_NAMESPACE.PERMISSIONS);

  log.info({ id }, "Update permission - completed");
  return permission;
}

export async function deletePermission(logger: Logger, id: string): Promise<void> {
  const log = scopedLogger(logger, LAYER, "deletePermission");
  log.info({ id }, "Delete permission - processing");

  const permission = await findPermissionOrThrow(log, id);
  await permissionRepository.hardDelete(log, permission);
  await invalidateNamespace(log, CACHE_NAMESPACE.PERMISSIONS);

  log.info({ id }, "Delete permission - completed");
}

/**
 * The actual access-control decision, called by the `checkPermission`
 * middleware on every guarded request: does the role the requester
 * CURRENTLY holds have an ACTIVE grant for this exact route pattern + HTTP
 * method?
 */
export async function hasAccess(logger: Logger, roleName: RoleName, path: string, method: HttpMethod): Promise<boolean> {
  const log = scopedLogger(logger, LAYER, "hasAccess");
  log.info({ role: roleName, path, method }, "Check access - processing");

  // Cached (invalidated whenever any role is created/renamed/deleted) so
  // resolving "role name -> role id" doesn't cost a query on every request.
  const role = await withCache(log, buildCacheKey(CACHE_NAMESPACE.ROLES, "byName", roleName), () =>
    roleRepository.findByName(log, roleName)
  );

  const grant = role ? await permissionRepository.findActiveGrant(log, role.id, path, method) : null;

  log.info({ role: roleName, path, method, allowed: Boolean(grant) }, "Check access - completed");
  return Boolean(grant);
}
