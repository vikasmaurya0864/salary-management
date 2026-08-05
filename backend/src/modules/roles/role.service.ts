import { Role, User } from "../../models";
import { AppError, ConflictError, NotFoundError } from "../../utils/app-error";
import type { CreateRoleInput, UpdateRoleInput } from "./role.validation";

export async function createRole(input: CreateRoleInput): Promise<Role> {
  const existing = await Role.findOne({ where: { name: input.name } });
  if (existing) {
    throw new ConflictError(`A role named '${input.name}' already exists`);
  }
  return Role.create({ name: input.name, description: input.description ?? null });
}

export async function listRoles(): Promise<Role[]> {
  return Role.findAll({ order: [["name", "ASC"]] });
}

async function findRoleOrThrow(id: string): Promise<Role> {
  const role = await Role.findByPk(id);
  if (!role) {
    throw new NotFoundError("Role not found");
  }
  return role;
}

export async function getRoleById(id: string): Promise<Role> {
  return findRoleOrThrow(id);
}

export async function updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
  const role = await findRoleOrThrow(id);

  if (input.name && input.name !== role.name) {
    const existing = await Role.findOne({ where: { name: input.name } });
    if (existing) {
      throw new ConflictError(`A role named '${input.name}' already exists`);
    }
    role.name = input.name;
  }

  if (input.description !== undefined) {
    role.description = input.description;
  }

  await role.save();
  return role;
}

export async function deleteRole(id: string): Promise<void> {
  const role = await findRoleOrThrow(id);

  const usersWithRole = await User.count({ where: { roleId: role.id } });
  if (usersWithRole > 0) {
    throw new AppError(
      `Cannot delete role '${role.name}': ${usersWithRole} user(s) are still assigned to it`,
      409,
      "ROLE_IN_USE"
    );
  }

  await role.destroy(); // soft delete (paranoid mode)
}
