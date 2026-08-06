import type { HttpMethod, Paginated, Permission, PermissionStatus, RoleName } from "../types";
import { apiRequest } from "./client";

export function listPermissions(params: {
  page?: number;
  limit?: number;
  roleId?: string;
} = {}): Promise<Paginated<Permission>> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.roleId) q.set("roleId", params.roleId);
  const query = q.toString();
  return apiRequest(`/api/permissions${query ? `?${query}` : ""}`);
}

/**
 * Grants a path + method to an entire ROLE in one row — every user
 * currently holding (or later moved into) that role is covered
 * automatically, since access checks match the requester's current role.
 */
export function createPermission(input: {
  role: RoleName;
  path: string;
  method: HttpMethod;
  status?: PermissionStatus;
}): Promise<Permission> {
  return apiRequest("/api/permissions", { method: "POST", body: input });
}

export function updatePermission(
  id: string,
  input: Partial<{ path: string; method: HttpMethod; status: PermissionStatus }>
): Promise<Permission> {
  return apiRequest(`/api/permissions/${id}`, { method: "PUT", body: input });
}

export function deletePermission(id: string): Promise<void> {
  return apiRequest(`/api/permissions/${id}`, { method: "DELETE" });
}
