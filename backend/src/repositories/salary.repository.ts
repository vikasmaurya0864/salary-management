import { Op } from "sequelize";
import type { CurrencyCode } from "../constants/employment";
import { Role, Salary, User } from "../models";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "SalaryRepository";
const withUser = {
  include: [
    { model: User, as: "user" as const, include: [{ model: Role, as: "role" as const }] },
    { model: User, as: "creator" as const },
  ],
};

export interface CreateSalaryRow {
  userId: string;
  currency: CurrencyCode;
  baseSalary: number;
  allowances: number;
  deductions: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
  createdBy: string;
}

export async function findById(logger: Logger, id: string): Promise<Salary | null> {
  const log = scopedLogger(logger, LAYER, "findById");
  log.info({ id }, "Find salary by id - querying database");
  const salary = await Salary.findByPk(id, withUser);
  log.info({ id, found: Boolean(salary) }, "Find salary by id - completed");
  return salary;
}

export async function findCurrentForUser(logger: Logger, userId: string): Promise<Salary | null> {
  const log = scopedLogger(logger, LAYER, "findCurrentForUser");
  log.info({ userId }, "Find current salary - querying database");
  const salary = await Salary.findOne({
    where: { userId, effectiveTo: null },
    include: withUser.include,
  });
  log.info({ userId, found: Boolean(salary) }, "Find current salary - completed");
  return salary;
}

/** Salary package that covers a given calendar date (YYYY-MM-DD). */
export async function findForUserOnDate(logger: Logger, userId: string, date: string): Promise<Salary | null> {
  const log = scopedLogger(logger, LAYER, "findForUserOnDate");
  log.info({ userId, date }, "Find salary on date - querying database");
  const salary = await Salary.findOne({
    where: {
      userId,
      effectiveFrom: { [Op.lte]: date },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: date } }],
    },
    order: [["effectiveFrom", "DESC"]],
  });
  log.info({ userId, date, found: Boolean(salary) }, "Find salary on date - completed");
  return salary;
}

export async function findHistoryForUser(logger: Logger, userId: string): Promise<Salary[]> {
  const log = scopedLogger(logger, LAYER, "findHistoryForUser");
  log.info({ userId }, "List salary history - querying database");
  const rows = await Salary.findAll({
    where: { userId },
    include: withUser.include,
    order: [["effectiveFrom", "DESC"]],
  });
  log.info({ userId, count: rows.length }, "List salary history - completed");
  return rows;
}

export async function findAndCountCurrent(
  logger: Logger,
  options: { where?: Record<string, unknown>; limit?: number; offset?: number }
): Promise<{ rows: Salary[]; count: number }> {
  const log = scopedLogger(logger, LAYER, "findAndCountCurrent");
  log.info({ limit: options.limit, offset: options.offset }, "List current salaries - querying database");
  const result = await Salary.findAndCountAll({
    where: { effectiveTo: null, ...(options.where ?? {}) },
    limit: options.limit,
    offset: options.offset,
    include: withUser.include,
    order: [["updatedAt", "DESC"]],
  });
  log.info({ count: result.count }, "List current salaries - completed");
  return result;
}

export async function create(logger: Logger, data: CreateSalaryRow): Promise<Salary> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info({ userId: data.userId, effectiveFrom: data.effectiveFrom }, "Create salary - inserting");
  const salary = await Salary.create({
    ...data,
    baseSalary: String(data.baseSalary),
    allowances: String(data.allowances),
    deductions: String(data.deductions),
  });
  log.info({ id: salary.id }, "Create salary - insert completed");
  return salary;
}

export async function save(logger: Logger, salary: Salary): Promise<Salary> {
  const log = scopedLogger(logger, LAYER, "save");
  log.info({ id: salary.id }, "Save salary - persisting");
  await salary.save();
  log.info({ id: salary.id }, "Save salary - completed");
  return salary;
}

export async function findAllCurrentWithUsers(logger: Logger): Promise<Salary[]> {
  const log = scopedLogger(logger, LAYER, "findAllCurrentWithUsers");
  log.info("Find all current salaries - querying database");
  const rows = await Salary.findAll({
    where: { effectiveTo: null },
    include: [{ model: User, as: "user", include: [{ model: Role, as: "role" }] }],
  });
  log.info({ count: rows.length }, "Find all current salaries - completed");
  return rows;
}
