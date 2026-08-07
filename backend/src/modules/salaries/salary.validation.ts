import { z } from "zod";
import { CURRENCIES } from "../../constants/employment";

const moneyField = z.coerce.number().finite().nonnegative().max(99_999_999.99);
const dateOnlyField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const createSalarySchema = z.object({
  userId: z.string().uuid(),
  currency: z.enum(CURRENCIES),
  baseSalary: moneyField,
  allowances: moneyField.default(0),
  deductions: moneyField.default(0),
  effectiveFrom: dateOnlyField,
  note: z.string().trim().max(500).optional(),
});
export type CreateSalaryInput = z.infer<typeof createSalarySchema>;

export const listSalariesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(15).default(15),
  userId: z.string().uuid().optional(),
});
export type ListSalariesQuery = z.infer<typeof listSalariesQuerySchema>;

export const generatePayslipSchema = z.object({
  userId: z.string().uuid(),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
export type GeneratePayslipInput = z.infer<typeof generatePayslipSchema>;

export const listPayslipsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(15).default(15),
  userId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
export type ListPayslipsQuery = z.infer<typeof listPayslipsQuerySchema>;

export const salaryAnalyticsQuerySchema = z.object({
  groupBy: z.enum(["country", "currency", "department", "role"]).default("currency"),
  format: z.enum(["json", "csv"]).default("json"),
});
export type SalaryAnalyticsQuery = z.infer<typeof salaryAnalyticsQuerySchema>;
