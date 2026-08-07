/**
 * Pure payroll helpers — no I/O. Used by the salary service and covered by
 * fast unit tests (no DB / Redis / HTTP).
 */

import { toCsv } from "./csv";

export interface PayComponents {
  baseSalary: number;
  allowances: number;
  deductions: number;
  gross: number;
  net: number;
}

export interface AnalyticsBucket {
  key: string;
  employeeCount: number;
  totalBase: number;
  totalAllowances: number;
  totalDeductions: number;
  totalGross: number;
  totalNet: number;
  averageNet: number;
}

export type AnalyticsGroupBy = "country" | "currency" | "department" | "role";

/** Row shape used when aggregating current packages for HR analytics. */
export interface SalaryAnalyticsRow {
  currency: string;
  baseSalary: string | number;
  allowances: string | number;
  deductions: string | number;
  user?: {
    country?: string | null;
    department?: string | null;
    role?: { name?: string | null } | null;
  } | null;
}

export function parseMoney(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid money value: ${String(value)}`);
  }
  return n;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Calendar day before an ISO date-only string (YYYY-MM-DD), in UTC. */
export function dayBefore(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Compute gross/net from package components. Rejects negative amounts and
 * deductions that exceed gross (same rules as createSalary).
 */
export function computePayComponents(
  baseSalary: number,
  allowances: number,
  deductions: number
): PayComponents {
  if (baseSalary < 0 || allowances < 0 || deductions < 0) {
    throw new Error("Pay amounts cannot be negative");
  }
  const gross = round2(baseSalary + allowances);
  if (deductions > gross) {
    throw new Error("Deductions cannot exceed base salary + allowances");
  }
  return {
    baseSalary: round2(baseSalary),
    allowances: round2(allowances),
    deductions: round2(deductions),
    gross,
    net: round2(gross - deductions),
  };
}

function groupKey(row: SalaryAnalyticsRow, groupBy: AnalyticsGroupBy): string {
  switch (groupBy) {
    case "country":
      return row.user?.country ?? "UNSET";
    case "currency":
      return row.currency;
    case "department":
      return row.user?.department ?? "UNSET";
    case "role":
      return row.user?.role?.name ?? "UNSET";
    default:
      return "UNKNOWN";
  }
}

/** Aggregate current salary packages into analytics buckets (sorted by totalNet desc). */
export function aggregateSalaryBuckets(
  rows: SalaryAnalyticsRow[],
  groupBy: AnalyticsGroupBy
): AnalyticsBucket[] {
  const map = new Map<string, AnalyticsBucket>();

  for (const row of rows) {
    const key = groupKey(row, groupBy);
    const base = parseMoney(row.baseSalary);
    const allowances = parseMoney(row.allowances);
    const deductions = parseMoney(row.deductions);
    const { gross, net } = computePayComponents(base, allowances, deductions);

    const bucket = map.get(key) ?? {
      key,
      employeeCount: 0,
      totalBase: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      totalGross: 0,
      totalNet: 0,
      averageNet: 0,
    };
    bucket.employeeCount += 1;
    bucket.totalBase += base;
    bucket.totalAllowances += allowances;
    bucket.totalDeductions += deductions;
    bucket.totalGross += gross;
    bucket.totalNet += net;
    map.set(key, bucket);
  }

  return [...map.values()]
    .map((b) => ({
      ...b,
      totalBase: round2(b.totalBase),
      totalAllowances: round2(b.totalAllowances),
      totalDeductions: round2(b.totalDeductions),
      totalGross: round2(b.totalGross),
      totalNet: round2(b.totalNet),
      averageNet: b.employeeCount ? round2(b.totalNet / b.employeeCount) : 0,
    }))
    .sort((a, b) => b.totalNet - a.totalNet);
}

export function analyticsBucketsToCsv(buckets: AnalyticsBucket[]): string {
  return toCsv([
    [
      "group",
      "employeeCount",
      "totalBase",
      "totalAllowances",
      "totalDeductions",
      "totalGross",
      "totalNet",
      "averageNet",
    ],
    ...buckets.map((b) => [
      b.key,
      b.employeeCount,
      b.totalBase,
      b.totalAllowances,
      b.totalDeductions,
      b.totalGross,
      b.totalNet,
      b.averageNet,
    ]),
  ]);
}
