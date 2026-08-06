import { ApiError } from "../api/client";

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) {
    if (error.code === "FORBIDDEN") {
      return `${error.message} (Admin may need to grant this API permission for your account.)`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}
