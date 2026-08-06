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

export const createPermissionSchema = z.object({
  userId: z.string().uuid(),
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

// Grants the same path+method to every user currently holding a role,
// instead of picking one user id at a time — the "select a role" flow.
export const bulkCreatePermissionByRoleSchema = z.object({
  role: z.enum([ROLE_NAMES.ADMIN, ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE]),
  path: pathField,
  method: z.enum(HTTP_METHODS),
  status: z.enum([PERMISSION_STATUS.ACTIVE, PERMISSION_STATUS.INACTIVE]).default(PERMISSION_STATUS.ACTIVE),
});
export type BulkCreatePermissionByRoleInput = z.infer<typeof bulkCreatePermissionByRoleSchema>;

export const listPermissionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  userId: z.string().uuid().optional(),
});
export type ListPermissionsQuery = z.infer<typeof listPermissionsQuerySchema>;
