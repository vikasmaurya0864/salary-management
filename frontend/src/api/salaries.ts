import type { CurrencyCode, Paginated, Payslip, Salary, SalaryAnalytics } from "../types";
import { apiDownload, apiRequest } from "./client";

export function listSalaries(params: { page?: number; limit?: number; userId?: string } = {}): Promise<Paginated<Salary>> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.userId) q.set("userId", params.userId);
  const query = q.toString();
  return apiRequest(`/api/salaries${query ? `?${query}` : ""}`);
}

export function getSalaryHistory(userId: string): Promise<Salary[]> {
  return apiRequest(`/api/salaries/history/${userId}`);
}

export function createSalary(input: {
  userId: string;
  currency: CurrencyCode;
  baseSalary: number;
  allowances?: number;
  deductions?: number;
  effectiveFrom: string;
  note?: string;
}): Promise<Salary> {
  return apiRequest("/api/salaries", { method: "POST", body: input });
}

export function listPayslips(params: {
  page?: number;
  limit?: number;
  userId?: string;
  year?: number;
  month?: number;
} = {}): Promise<Paginated<Payslip>> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.userId) q.set("userId", params.userId);
  if (params.year) q.set("year", String(params.year));
  if (params.month) q.set("month", String(params.month));
  const query = q.toString();
  return apiRequest(`/api/salaries/payslips${query ? `?${query}` : ""}`);
}

export function generatePayslip(input: { userId: string; year: number; month: number }): Promise<Payslip> {
  return apiRequest("/api/salaries/payslips", { method: "POST", body: input });
}

export function getSalaryAnalytics(groupBy: SalaryAnalytics["groupBy"] = "currency"): Promise<SalaryAnalytics> {
  return apiRequest(`/api/salaries/analytics?groupBy=${groupBy}`);
}

export function downloadSalaryAnalyticsCsv(groupBy: SalaryAnalytics["groupBy"] = "currency"): Promise<Blob> {
  return apiDownload(`/api/salaries/analytics?groupBy=${groupBy}&format=csv`);
}
