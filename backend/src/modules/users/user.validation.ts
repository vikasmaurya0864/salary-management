import { z } from "zod";
import { CURRENCIES, EMPLOYMENT_STATUSES } from "../../constants/employment";
import { ROLE_NAMES } from "../../constants/roles";

const mobileRegex = /^\+?[0-9]{7,15}$/;
const countryField = z
  .string()
  .trim()
  .length(2, "country must be a 2-letter ISO code")
  .transform((value) => value.toUpperCase());
const currencyField = z.enum(CURRENCIES);
const dateOnlyField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const roleField = z.enum([ROLE_NAMES.ADMIN, ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE]);

const employmentFields = {
  country: countryField.nullable().optional(),
  currency: currencyField.optional(),
  department: z.string().trim().max(100).nullable().optional(),
  jobTitle: z.string().trim().max(100).nullable().optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  joinedAt: dateOnlyField.nullable().optional(),
  exitedAt: dateOnlyField.nullable().optional(),
};

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long").max(100),
  mobile: z.string().trim().regex(mobileRegex, "Invalid mobile number"),
  address: z.string().trim().max(500).optional(),
  role: roleField,
  ...employmentFields,
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    password: z.string().min(8).max(100).optional(),
    mobile: z.string().trim().regex(mobileRegex, "Invalid mobile number").optional(),
    address: z.string().trim().max(500).optional(),
    ...employmentFields,
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(15).default(15),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const allocateRoleSchema = z.object({
  role: z.enum([ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE]),
});
export type AllocateRoleInput = z.infer<typeof allocateRoleSchema>;
