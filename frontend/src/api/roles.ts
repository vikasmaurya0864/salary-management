import type { Role } from "../types";
import { apiRequest } from "./client";

export function listRoles(): Promise<Role[]> {
  return apiRequest("/api/roles");
}

export function createRole(input: { name: string; description?: string }): Promise<Role> {
  return apiRequest("/api/roles", { method: "POST", body: input });
}

export function updateRole(id: string, input: { name?: string; description?: string }): Promise<Role> {
  return apiRequest(`/api/roles/${id}`, { method: "PUT", body: input });
}

export function deleteRole(id: string): Promise<void> {
  return apiRequest(`/api/roles/${id}`, { method: "DELETE" });
}
