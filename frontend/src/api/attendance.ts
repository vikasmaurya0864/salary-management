import type { Attendance, AttendanceReport, AttendanceStatus, CorrectionRequest, Paginated } from "../types";
import { apiDownload, apiRequest } from "./client";

export function markAttendance(input: {
  date: string;
  status?: "PRESENT" | "ABSENT";
  checkInTime?: string;
  checkOutTime?: string;
  workingHours?: number;
}): Promise<Attendance> {
  return apiRequest("/api/attendance", { method: "POST", body: input });
}

export function listAttendance(params: {
  page?: number;
  limit?: number;
  userId?: string;
  date?: string;
  status?: AttendanceStatus;
} = {}): Promise<Paginated<Attendance>> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.userId) q.set("userId", params.userId);
  if (params.date) q.set("date", params.date);
  if (params.status) q.set("status", params.status);
  const query = q.toString();
  return apiRequest(`/api/attendance${query ? `?${query}` : ""}`);
}

export function getAttendanceReport(params: {
  month: number;
  year: number;
  userId?: string;
}): Promise<AttendanceReport> {
  const q = new URLSearchParams({
    month: String(params.month),
    year: String(params.year),
    format: "json",
  });
  if (params.userId) q.set("userId", params.userId);
  return apiRequest(`/api/attendance/report?${q.toString()}`);
}

export async function downloadAttendanceReportCsv(params: {
  month: number;
  year: number;
  userId?: string;
}): Promise<void> {
  const q = new URLSearchParams({
    month: String(params.month),
    year: String(params.year),
    format: "csv",
  });
  if (params.userId) q.set("userId", params.userId);
  const blob = await apiDownload(`/api/attendance/report?${q.toString()}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-report-${params.year}-${String(params.month).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function listCorrections(params: {
  page?: number;
  limit?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
} = {}): Promise<Paginated<CorrectionRequest>> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.status) q.set("status", params.status);
  const query = q.toString();
  return apiRequest(`/api/attendance/corrections${query ? `?${query}` : ""}`);
}

export function requestCorrection(input: {
  date: string;
  requestedStatus?: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  workingHours?: number;
  reason: string;
}): Promise<CorrectionRequest> {
  return apiRequest("/api/attendance/corrections", { method: "POST", body: input });
}

export function reviewCorrection(
  id: string,
  input: { action: "APPROVE" | "REJECT"; reviewNote?: string }
): Promise<CorrectionRequest> {
  return apiRequest(`/api/attendance/corrections/${id}/review`, { method: "PATCH", body: input });
}
