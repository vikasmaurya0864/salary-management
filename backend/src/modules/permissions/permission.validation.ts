import { z } from "zod";
import { HTTP_METHODS, PERMISSION_STATUS } from "../../constants/permission";
import { ROLE_NAMES } from "../../constants/roles";

// Must be the Fastify *route pattern* (e.g. `/api/users/:id`), not a
// resolved URL with real ids — see `checkPermission` middleware and
// `Permission` model for why.
const pathField = z
  .string()
  .trim()
  .min(1, "path is required")
  .refine((value) => value.startsWith("/"), "path must start with '/'");

const roleField = z.enum([ROLE_NAMES.ADMIN, ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE]);

// Grants a path+method to a whole ROLE (every user CURRENTLY holding it,
// and any user later moved into it) — there is no per-user grant.
export const createPermissionSchema = z.object({
  role: roleField,
  path: pathField,
  method: z.enum(HTTP_METHODS),
  status: z.enum([PERMISSION_STATUS.ACTIVE, PERMISSION_STATUS.INACTIVE]).default(PERMISSION_STATUS.ACTIVE),
});
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;

export const updatePermissionSchema = z
  .object({
    path: pathField.optional(),
    method: z.enum(HTTP_METHODS).optional(),
    status: z.enum([PERMISSION_STATUS.ACTIVE, PERMISSION_STATUS.INACTIVE]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;

export const listPermissionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  roleId: z.string().uuid().optional(),
});
export type ListPermissionsQuery = z.infer<typeof listPermissionsQuerySchema>;
