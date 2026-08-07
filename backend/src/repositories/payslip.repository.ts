import type { CurrencyCode } from "../constants/employment";
import { Payslip, Role, User } from "../models";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "PayslipRepository";
const withUser = {
  include: [{ model: User, as: "user" as const, include: [{ model: Role, as: "role" as const }] }],
};

export interface CreatePayslipRow {
  userId: string;
  salaryId: string | null;
  year: number;
  month: number;
  currency: CurrencyCode;
  baseSalary: number;
  allowances: number;
  deductions: number;
  gross: number;
  net: number;
  generatedBy: string;
}

export async function findByUserYearMonth(
  logger: Logger,
  userId: string,
  year: number,
  month: number
): Promise<Payslip | null> {
  const log = scopedLogger(logger, LAYER, "findByUserYearMonth");
  log.info({ userId, year, month }, "Find payslip - querying database");
  const payslip = await Payslip.findOne({ where: { userId, year, month }, include: withUser.include });
  log.info({ userId, year, month, found: Boolean(payslip) }, "Find payslip - completed");
  return payslip;
}

export async function findAndCountAll(
  logger: Logger,
  options: { where?: Record<string, unknown>; limit?: number; offset?: number }
): Promise<{ rows: Payslip[]; count: number }> {
  const log = scopedLogger(logger, LAYER, "findAndCountAll");
  const result = await Payslip.findAndCountAll({
    where: options.where,
    limit: options.limit,
    offset: options.offset,
    include: withUser.include,
    order: [
      ["year", "DESC"],
      ["month", "DESC"],
    ],
  });
  log.info({ count: result.count }, "List payslips - completed");
  return result;
}

export async function create(logger: Logger, data: CreatePayslipRow): Promise<Payslip> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info({ userId: data.userId, year: data.year, month: data.month }, "Create payslip - inserting");
  const payslip = await Payslip.create({
    ...data,
    baseSalary: String(data.baseSalary),
    allowances: String(data.allowances),
    deductions: String(data.deductions),
    gross: String(data.gross),
    net: String(data.net),
  });
  log.info({ id: payslip.id }, "Create payslip - insert completed");
  return payslip;
}
