import type { HttpMethod, Paginated, Permission, PermissionStatus } from "../types";
import { apiRequest } from "./client";

export function listPermissions(params: {
  page?: number;
  limit?: number;
  userId?: string;
} = {}): Promise<Paginated<Permission>> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.userId) q.set("userId", params.userId);
  const query = q.toString();
  return apiRequest(`/api/permissions${query ? `?${query}` : ""}`);
}

export function createPermission(input: {
  userId: string;
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
