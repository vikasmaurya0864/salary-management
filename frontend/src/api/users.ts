import type { Paginated, RoleName, User, UserStats } from "../types";
import { apiRequest } from "./client";

export function listUsers(page = 1, limit = 20): Promise<Paginated<User>> {
  return apiRequest(`/api/users?page=${page}&limit=${limit}`);
}

/** Active vs inactive (soft-deleted) headcount per role — powers the admin/HR dashboard stat cards. */
export function getUserStats(): Promise<UserStats> {
  return apiRequest(`/api/users/stats`);
}

export function getUser(id: string): Promise<User> {
  return apiRequest(`/api/users/${id}`);
}

export function createUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mobile: string;
  address?: string;
  role: RoleName;
}): Promise<User> {
  return apiRequest("/api/users", { method: "POST", body: input });
}

export function updateUser(
  id: string,
  input: Partial<{ firstName: string; lastName: string; mobile: string; address: string; password: string }>
): Promise<User> {
  return apiRequest(`/api/users/${id}`, { method: "PUT", body: input });
}

export function updateUserRole(id: string, role: "HR" | "EMPLOYEE"): Promise<User> {
  return apiRequest(`/api/users/${id}/role`, { method: "PATCH", body: { role } });
}

export function deleteUser(id: string): Promise<void> {
  return apiRequest(`/api/users/${id}`, { method: "DELETE" });
}
