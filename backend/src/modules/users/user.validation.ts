import { z } from "zod";
import { ROLE_NAMES } from "../../constants/roles";

const mobileRegex = /^\+?[0-9]{7,15}$/;

const roleField = z.enum([ROLE_NAMES.ADMIN, ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE]);

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long").max(100),
  mobile: z.string().trim().regex(mobileRegex, "Invalid mobile number"),
  address: z.string().trim().max(500).optional(),
  role: roleField,
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

// Role changes are deliberately NOT part of a profile update — they go
// through the dedicated "allocate role" endpoint/schema below, which is
// admin-only and audited/logged as its own distinct action.
export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    password: z.string().min(8).max(100).optional(),
    mobile: z.string().trim().regex(mobileRegex, "Invalid mobile number").optional(),
    address: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// Only Admin allocates roles, and only to HR or EMPLOYEE — creating
// additional Admins through the API is never allowed (see
// `assertCanAssignRole` in `user.service.ts`).
export const allocateRoleSchema = z.object({
  role: z.enum([ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE]),
});
export type AllocateRoleInput = z.infer<typeof allocateRoleSchema>;
