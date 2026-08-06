import type { ApiErrorBody, AuthSession } from "../types";
import { clearSession, getAccessToken, getRefreshToken, saveSession } from "./storage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const API_KEY = import.meta.env.VITE_API_KEY as string;

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * `fetch()` itself throws (not a rejected HTTP status) when the request
 * never reaches the server at all — backend down, wrong host/port, DNS, a
 * failed CORS preflight, offline, etc. Without this wrapper that raw
 * runtime error message (e.g. "Failed to fetch"/"fetch failed") would leak
 * straight into the UI instead of a message users can act on.
 */
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check your connection and that the backend is running, then try again.",
      "NETWORK_ERROR",
      0
    );
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  skipRefresh?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await safeFetch(`${BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    return false;
  }

  const json = (await response.json()) as { success: true; data: AuthSession };
  saveSession(json.data);
  return true;
}

async function ensureRefreshed(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, skipRefresh = false, headers: extraHeaders, ...rest } = options;

  const headers = new Headers(extraHeaders);
  headers.set("X-API-Key", API_KEY);
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await safeFetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth && !skipRefresh) {
    const errorJson = (await response.clone().json().catch(() => null)) as ApiErrorBody | null;
    const code = errorJson?.error?.code;
    if (code === "TOKEN_EXPIRED" || code === "UNAUTHENTICATED") {
      const refreshed = await ensureRefreshed();
      if (refreshed) {
        return apiRequest<T>(path, { ...options, skipRefresh: true });
      }
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      throw new ApiError(response.statusText || "Request failed", "HTTP_ERROR", response.status);
    }
    return (await response.text()) as T;
  }

  const json = await response.json();
  if (!response.ok || json.success === false) {
    const err = (json as ApiErrorBody).error;
    throw new ApiError(err?.message ?? "Request failed", err?.code ?? "HTTP_ERROR", err?.statusCode ?? response.status, err?.details);
  }

  return json.data as T;
}

export async function apiDownload(path: string): Promise<Blob> {
  const headers = new Headers();
  headers.set("X-API-Key", API_KEY);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response = await safeFetch(`${BASE_URL}${path}`, { headers });

  if (response.status === 401) {
    const refreshed = await ensureRefreshed();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${getAccessToken()}`);
      response = await safeFetch(`${BASE_URL}${path}`, { headers });
    }
  }

  if (!response.ok) {
    throw new ApiError("Download failed", "DOWNLOAD_FAILED", response.status);
  }

  return response.blob();
}
