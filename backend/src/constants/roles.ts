/**
 * Canonical role names, matching the rows seeded into the `roles` table
 * (see `src/database/seeders/20260805130200-seed-initial-data.cjs`).
 * Referenced by name (not id) throughout the app so business logic never
 * has to hardcode UUIDs.
 */
export const ROLE_NAMES = {
  ADMIN: "ADMIN",
  HR: "HR",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

export const ALL_ROLE_NAMES: readonly RoleName[] = Object.values(ROLE_NAMES);
