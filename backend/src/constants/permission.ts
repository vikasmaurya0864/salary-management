/** HTTP methods a permission grant can be scoped to. */
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * A permission row is a toggle, not a delete-to-revoke record — INACTIVE
 * keeps history around (who had access, when) while immediately blocking it.
 */
export const PERMISSION_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type PermissionStatus = (typeof PERMISSION_STATUS)[keyof typeof PERMISSION_STATUS];
