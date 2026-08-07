import type { User } from "../../models";
import * as userRepository from "../../repositories/user.repository";
import * as roleRepository from "../../repositories/role.repository";
import { ALL_ROLE_NAMES, ROLE_NAMES, type RoleName } from "../../constants/roles";
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/app-error";
import { buildCacheKey, CACHE_NAMESPACE, invalidateNamespace, withCache } from "../../utils/cache";
import type { Logger } from "../../utils/logger";
import { presentUser } from "../../utils/present-user";
import { scopedLogger } from "../../utils/scoped-logger";
import type { AllocateRoleInput, CreateUserInput, ListUsersQuery, UpdateUserInput } from "./user.validation";

const LAYER = "UserService";

interface RequestingUser {
  userId: string;
  role: RoleName;
}

async function getRoleByNameOrThrow(logger: Logger, name: RoleName) {
  const role = await roleRepository.findByName(logger, name);
  if (!role) {
    throw new AppError(`Role '${name}' is not configured. Run the database seeders.`, 500, "ROLE_NOT_CONFIGURED");
  }
  return role;
}

/**
 * Enforces: at most one ADMIN account may ever exist in the database, and
 * HR may only create Employees.
 *
 * The single admin account is meant to be provisioned exactly once, by the
 * database seeder (see `20260805130200-seed-initial-data.cjs`) — never
 * through the API. This is checked with a real COUNT query against the
 * `users` table (not just a blanket "never allowed") so the rule is
 * explicit and auditable: if an admin already exists, any attempt to
 * create or promote another one is rejected with a clear reason.
 */
async function assertCanAssignRole(logger: Logger, creatorRole: RoleName, targetRole: RoleName): Promise<void> {
  if (targetRole === ROLE_NAMES.ADMIN) {
    const adminCount = await userRepository.countByRoleName(logger, ROLE_NAMES.ADMIN);
    if (adminCount > 0) {
      throw new ConflictError(
        "An admin account already exists. Only one admin account is allowed — additional admin accounts cannot be created through the API."
      );
    }
    // Belt-and-suspenders: even in the (practically unreachable) case no
    // admin exists yet, the API still refuses — the admin account is only
    // ever provisioned by the database seeder, never via HTTP.
    throw new ForbiddenError("Admin accounts can only be provisioned by the database seeder, not through the API");
  }
  if (creatorRole === ROLE_NAMES.ADMIN) {
    return;
  }
  if (creatorRole === ROLE_NAMES.HR) {
    if (targetRole !== ROLE_NAMES.EMPLOYEE) {
      throw new ForbiddenError("HR can only create Employee accounts");
    }
    return;
  }
  throw new ForbiddenError();
}

/** Enforces: Admin sees everyone, HR only Employees, Employees only themselves. */
function assertCanAccessTarget(requester: RequestingUser, target: User): void {
  if (requester.role === ROLE_NAMES.ADMIN) {
    return;
  }
  if (requester.role === ROLE_NAMES.HR) {
    if (target.role?.name === ROLE_NAMES.EMPLOYEE) {
      return;
    }
    throw new ForbiddenError("HR can only access Employee records");
  }
  if (target.id === requester.userId) {
    return;
  }
  throw new ForbiddenError();
}

export async function createUser(logger: Logger, creatorRole: RoleName, input: CreateUserInput): Promise<User> {
  const log = scopedLogger(logger, LAYER, "createUser");
  log.info({ email: input.email, targetRole: input.role }, "Create user - processing");

  await assertCanAssignRole(log, creatorRole, input.role);

  const existing = await userRepository.findByEmail(log, input.email);
  if (existing) {
    log.warn({ email: input.email }, "Create user - email already in use");
    throw new ConflictError("A user with this email already exists");
  }

  const role = await getRoleByNameOrThrow(log, input.role);

  const user = await userRepository.create(log, {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    password: input.password,
    mobile: input.mobile,
    address: input.address ?? null,
    country: input.country ?? null,
    currency: input.currency ?? "USD",
    department: input.department ?? null,
    jobTitle: input.jobTitle ?? null,
    employmentStatus: input.employmentStatus ?? "ACTIVE",
    joinedAt: input.joinedAt ?? null,
    exitedAt: input.exitedAt ?? null,
    roleId: role.id,
  });

  user.role = role;
  await invalidateNamespace(log, CACHE_NAMESPACE.USERS);
  log.info({ id: user.id }, "Create user - completed");
  return user;
}

export interface PaginatedUsers {
  /** Plain user payloads (password stripped) — safe to cache / return. */
  items: Record<string, unknown>[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listUsers(
  logger: Logger,
  requester: { role: RoleName },
  query: ListUsersQuery
): Promise<PaginatedUsers> {
  const log = scopedLogger(logger, LAYER, "listUsers");
  log.info({ role: requester.role, page: query.page, limit: query.limit }, "List users - processing");

  const where: Record<string, unknown> = {};

  if (requester.role === ROLE_NAMES.HR) {
    const employeeRole = await getRoleByNameOrThrow(log, ROLE_NAMES.EMPLOYEE);
    where.roleId = employeeRole.id;
  }

  const offset = (query.page - 1) * query.limit;
  const cacheKey = buildCacheKey(CACHE_NAMESPACE.USERS, "list", requester.role, query.page, query.limit);
  // Present before caching so Redis never stores Sequelize instances (or passwords)
  // and cache hits stay usable without `.toJSON()`.
  const { rows, count } = await withCache(log, cacheKey, async () => {
    const result = await userRepository.findAndCountAll(log, { where, limit: query.limit, offset });
    return { rows: result.rows.map((user) => presentUser(user)), count: result.count };
  });

  log.info({ total: count }, "List users - completed");
  return {
    items: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count,
      totalPages: Math.ceil(count / query.limit) || 1,
    },
  };
}

export interface RoleUserCounts {
  active: number;
  inactive: number;
}

export interface UserStats {
  totalActive: number;
  totalInactive: number;
  byRole: Partial<Record<RoleName, RoleUserCounts>>;
}

/**
 * Admin dashboard headcount: active vs inactive (soft-deleted) users,
 * broken down by role. Admin sees every role; HR is scoped to Employees
 * only, matching the same visibility rule used everywhere else in this module.
 */
export async function getUserStats(logger: Logger, requester: { role: RoleName }): Promise<UserStats> {
  const log = scopedLogger(logger, LAYER, "getUserStats");
  log.info({ role: requester.role }, "Get user stats - processing");

  if (requester.role === ROLE_NAMES.EMPLOYEE) {
    throw new ForbiddenError("Only Admin or HR can view user statistics");
  }

  const stats = await withCache(log, buildCacheKey(CACHE_NAMESPACE.USERS, "stats", requester.role), async () => {
    const rolesToInclude: readonly RoleName[] =
      requester.role === ROLE_NAMES.HR ? [ROLE_NAMES.EMPLOYEE] : ALL_ROLE_NAMES;

    const byRole: Partial<Record<RoleName, RoleUserCounts>> = {};
    let totalActive = 0;
    let totalInactive = 0;

    for (const roleName of rolesToInclude) {
      const role = await roleRepository.findByName(log, roleName);
      if (!role) continue; // role not seeded yet — report zero rather than failing the whole dashboard
      const counts = await userRepository.countByRoleActiveState(log, role.id);
      byRole[roleName] = counts;
      totalActive += counts.active;
      totalInactive += counts.inactive;
    }

    return { totalActive, totalInactive, byRole };
  });

  log.info({ totalActive: stats.totalActive, totalInactive: stats.totalInactive }, "Get user stats - completed");
  return stats;
}

async function findUserOrThrow(logger: Logger, id: string): Promise<User> {
  const user = await userRepository.findById(logger, id);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
}

export async function getUserById(logger: Logger, requester: RequestingUser, id: string): Promise<User> {
  const log = scopedLogger(logger, LAYER, "getUserById");
  log.info({ id }, "Get user - processing");

  // Always load a live model for authorization (role association). List
  // responses are cached separately as plain objects; by-id reads are cheap
  // enough that we avoid the cache/model mismatch that broke `.toJSON()`.
  const user = await findUserOrThrow(log, id);
  assertCanAccessTarget(requester, user);

  log.info({ id }, "Get user - completed");
  return user;
}

export async function updateUser(
  logger: Logger,
  requester: RequestingUser,
  id: string,
  input: UpdateUserInput
): Promise<User> {
  const log = scopedLogger(logger, LAYER, "updateUser");
  log.info({ id }, "Update user - processing");

  const user = await findUserOrThrow(log, id);
  assertCanAccessTarget(requester, user);

  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.mobile !== undefined) user.mobile = input.mobile;
  if (input.address !== undefined) user.address = input.address;
  if (input.password !== undefined) user.password = input.password; // re-hashed by the model's beforeUpdate hook

  // Employment / org master-data is HR/Admin-managed — employees cannot
  // change their own country, department, status, etc. via profile edit.
  const canEditEmployment = requester.role === ROLE_NAMES.ADMIN || requester.role === ROLE_NAMES.HR;
  if (canEditEmployment) {
    if (input.country !== undefined) user.country = input.country;
    if (input.currency !== undefined) user.currency = input.currency;
    if (input.department !== undefined) user.department = input.department;
    if (input.jobTitle !== undefined) user.jobTitle = input.jobTitle;
    if (input.employmentStatus !== undefined) user.employmentStatus = input.employmentStatus;
    if (input.joinedAt !== undefined) user.joinedAt = input.joinedAt;
    if (input.exitedAt !== undefined) user.exitedAt = input.exitedAt;
  }

  await userRepository.save(log, user);
  await invalidateNamespace(log, CACHE_NAMESPACE.USERS);

  log.info({ id }, "Update user - completed");
  return user;
}

/**
 * Dedicated "role allocation" action — deliberately separate from
 * `updateUser` (a plain profile edit) so assigning HR/Employee roles is its
 * own auditable, admin-only operation, matching how role changes are
 * granted in the real org (Admin allocates the HR role; HR never touches
 * roles at all).
 */
export async function allocateRole(
  logger: Logger,
  requester: RequestingUser,
  id: string,
  input: AllocateRoleInput
): Promise<User> {
  const log = scopedLogger(logger, LAYER, "allocateRole");
  log.info({ id, newRole: input.role }, "Allocate role - processing");

  if (requester.role !== ROLE_NAMES.ADMIN) {
    log.warn({ requesterRole: requester.role }, "Allocate role - forbidden, only admin may allocate roles");
    throw new ForbiddenError("Only an admin can allocate roles");
  }

  const user = await findUserOrThrow(log, id);
  await assertCanAssignRole(log, requester.role, input.role);

  const role = await getRoleByNameOrThrow(log, input.role);
  user.roleId = role.id;
  await userRepository.save(log, user);
  await userRepository.reloadWithRole(log, user);
  await invalidateNamespace(log, CACHE_NAMESPACE.USERS);

  log.info({ id, newRole: input.role }, "Allocate role - completed");
  return user;
}

export async function deleteUser(logger: Logger, requester: RequestingUser, id: string): Promise<void> {
  const log = scopedLogger(logger, LAYER, "deleteUser");
  log.info({ id }, "Delete user - processing");

  const user = await findUserOrThrow(log, id);
  assertCanAccessTarget(requester, user);

  if (user.id === requester.userId) {
    log.warn({ id }, "Delete user - forbidden, cannot delete own account");
    throw new BadRequestError("You cannot delete your own account");
  }
  if (user.role?.name === ROLE_NAMES.ADMIN) {
    log.warn({ id }, "Delete user - forbidden, cannot delete admin accounts");
    throw new ForbiddenError("Admin accounts cannot be deleted");
  }

  await userRepository.softDelete(log, user);
  await invalidateNamespace(log, CACHE_NAMESPACE.USERS);
  log.info({ id }, "Delete user - completed");
}
