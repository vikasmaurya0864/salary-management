import type { AuthSession } from "../types";
import { apiRequest } from "./client";

export function login(email: string, password: string): Promise<AuthSession> {
  return apiRequest<AuthSession>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export function register(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mobile: string;
  address?: string;
}): Promise<AuthSession> {
  return apiRequest<AuthSession>("/api/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
}
