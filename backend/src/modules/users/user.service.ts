import type { User } from "../../models";
import * as userRepository from "../../repositories/user.repository";
import * as roleRepository from "../../repositories/role.repository";
import { ROLE_NAMES, type RoleName } from "../../constants/roles";
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/app-error";
import type { Logger } from "../../utils/logger";
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

/** Enforces: nobody creates extra admins; HR may only create Employees. */
function assertCanAssignRole(creatorRole: RoleName, targetRole: RoleName): void {
  if (targetRole === ROLE_NAMES.ADMIN) {
    throw new ForbiddenError("Additional admin accounts cannot be created through the API");
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

  assertCanAssignRole(creatorRole, input.role);

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
    roleId: role.id,
  });

  user.role = role;
  log.info({ id: user.id }, "Create user - completed");
  return user;
}

export interface PaginatedUsers {
  items: User[];
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
  const { rows, count } = await userRepository.findAndCountAll(log, { where, limit: query.limit, offset });

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

  await userRepository.save(log, user);

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
  assertCanAssignRole(requester.role, input.role);

  const role = await getRoleByNameOrThrow(log, input.role);
  user.roleId = role.id;
  await userRepository.save(log, user);
  await userRepository.reloadWithRole(log, user);

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
  log.info({ id }, "Delete user - completed");
}
