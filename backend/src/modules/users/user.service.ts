import { Role, User } from "../../models";
import { ROLE_NAMES, type RoleName } from "../../constants/roles";
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/app-error";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./user.validation";

interface RequestingUser {
  userId: string;
  role: RoleName;
}

async function getRoleByName(name: RoleName): Promise<Role> {
  const role = await Role.findOne({ where: { name } });
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

export async function createUser(creatorRole: RoleName, input: CreateUserInput): Promise<User> {
  assertCanAssignRole(creatorRole, input.role);

  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("A user with this email already exists");
  }

  const role = await getRoleByName(input.role);

  const user = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    password: input.password,
    mobile: input.mobile,
    address: input.address ?? null,
    roleId: role.id,
  });

  user.role = role;
  return user;
}

export interface PaginatedUsers {
  items: User[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listUsers(requester: { role: RoleName }, query: ListUsersQuery): Promise<PaginatedUsers> {
  const where: Record<string, unknown> = {};

  if (requester.role === ROLE_NAMES.HR) {
    const employeeRole = await getRoleByName(ROLE_NAMES.EMPLOYEE);
    where.roleId = employeeRole.id;
  }

  const offset = (query.page - 1) * query.limit;

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [{ model: Role, as: "role" }],
    limit: query.limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

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

async function findUserOrThrow(id: string): Promise<User> {
  const user = await User.findByPk(id, { include: [{ model: Role, as: "role" }] });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
}

export async function getUserById(requester: RequestingUser, id: string): Promise<User> {
  const user = await findUserOrThrow(id);
  assertCanAccessTarget(requester, user);
  return user;
}

export async function updateUser(requester: RequestingUser, id: string, input: UpdateUserInput): Promise<User> {
  const user = await findUserOrThrow(id);
  assertCanAccessTarget(requester, user);

  if (input.role && input.role !== user.role?.name) {
    if (requester.role !== ROLE_NAMES.ADMIN) {
      throw new ForbiddenError("Only an admin can change a user's role");
    }
    assertCanAssignRole(requester.role, input.role);
    const role = await getRoleByName(input.role);
    user.roleId = role.id;
  }

  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.mobile !== undefined) user.mobile = input.mobile;
  if (input.address !== undefined) user.address = input.address;
  if (input.password !== undefined) user.password = input.password; // re-hashed by the beforeUpdate hook

  await user.save();
  await user.reload({ include: [{ model: Role, as: "role" }] });
  return user;
}

export async function deleteUser(requester: RequestingUser, id: string): Promise<void> {
  const user = await findUserOrThrow(id);
  assertCanAccessTarget(requester, user);

  if (user.id === requester.userId) {
    throw new BadRequestError("You cannot delete your own account");
  }
  if (user.role?.name === ROLE_NAMES.ADMIN) {
    throw new ForbiddenError("Admin accounts cannot be deleted");
  }

  await user.destroy(); // soft delete (paranoid mode)
}
