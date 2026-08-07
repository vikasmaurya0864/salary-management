import type { Payslip, Salary, User } from "../../models";
import * as payslipRepository from "../../repositories/payslip.repository";
import * as salaryRepository from "../../repositories/salary.repository";
import * as userRepository from "../../repositories/user.repository";
import { ROLE_NAMES, type RoleName } from "../../constants/roles";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/app-error";
import { buildCacheKey, CACHE_NAMESPACE, invalidateNamespace, withCache } from "../../utils/cache";
import type { Logger } from "../../utils/logger";
import {
  aggregateSalaryBuckets,
  analyticsBucketsToCsv,
  computePayComponents,
  dayBefore,
  parseMoney,
  type AnalyticsBucket,
} from "../../utils/salary-math";
import { scopedLogger } from "../../utils/scoped-logger";
import type {
  CreateSalaryInput,
  GeneratePayslipInput,
  ListPayslipsQuery,
  ListSalariesQuery,
  SalaryAnalyticsQuery,
} from "./salary.validation";

const LAYER = "SalaryService";

interface RequestingUser {
  userId: string;
  role: RoleName;
}

function assertCanAccessEmployee(requester: RequestingUser, target: User): void {
  if (requester.role === ROLE_NAMES.ADMIN) return;
  if (requester.role === ROLE_NAMES.HR) {
    if (target.role?.name === ROLE_NAMES.EMPLOYEE) return;
    throw new ForbiddenError("HR can only manage Employee compensation");
  }
  if (target.id === requester.userId) return;
  throw new ForbiddenError();
}

function assertCanMutateSalary(requester: RequestingUser): void {
  if (requester.role === ROLE_NAMES.ADMIN || requester.role === ROLE_NAMES.HR) return;
  throw new ForbiddenError("Only Admin or HR can manage salaries");
}

export async function createSalary(
  logger: Logger,
  requester: RequestingUser,
  input: CreateSalaryInput
): Promise<Salary> {
  const log = scopedLogger(logger, LAYER, "createSalary");
  log.info({ userId: input.userId, effectiveFrom: input.effectiveFrom }, "Create salary - processing");
  assertCanMutateSalary(requester);

  try {
    computePayComponents(input.baseSalary, input.allowances, input.deductions);
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : "Invalid pay amounts");
  }

  const user = await userRepository.findById(log, input.userId);
  if (!user) throw new NotFoundError("User not found");
  assertCanAccessEmployee(requester, user);

  const current = await salaryRepository.findCurrentForUser(log, input.userId);
  if (current) {
    if (input.effectiveFrom <= current.effectiveFrom) {
      throw new BadRequestError(
        `New package effectiveFrom must be after the current package start (${current.effectiveFrom})`
      );
    }
    current.effectiveTo = dayBefore(input.effectiveFrom);
    await salaryRepository.save(log, current);
  }

  const salary = await salaryRepository.create(log, {
    userId: input.userId,
    currency: input.currency,
    baseSalary: input.baseSalary,
    allowances: input.allowances,
    deductions: input.deductions,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: null,
    note: input.note ?? null,
    createdBy: requester.userId,
  });

  // Keep employee currency in sync with their current package.
  user.currency = input.currency;
  await userRepository.save(log, user);

  await invalidateNamespace(log, CACHE_NAMESPACE.SALARIES);
  await invalidateNamespace(log, CACHE_NAMESPACE.USERS);
  log.info({ id: salary.id }, "Create salary - completed");
  return salary;
}

export async function listCurrentSalaries(
  logger: Logger,
  requester: RequestingUser,
  query: ListSalariesQuery
): Promise<{ items: Salary[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const log = scopedLogger(logger, LAYER, "listCurrentSalaries");
  log.info({ page: query.page }, "List current salaries - processing");

  if (requester.role === ROLE_NAMES.EMPLOYEE) {
    const history = await salaryRepository.findHistoryForUser(log, requester.userId);
    const current = history.filter((s) => s.effectiveTo === null);
    return {
      items: current,
      pagination: { page: 1, limit: query.limit, total: current.length, totalPages: 1 },
    };
  }

  if (query.userId) {
    const user = await userRepository.findById(log, query.userId);
    if (!user) throw new NotFoundError("User not found");
    assertCanAccessEmployee(requester, user);
    const history = await withCache(
      log,
      buildCacheKey(CACHE_NAMESPACE.SALARIES, "history", query.userId),
      () => salaryRepository.findHistoryForUser(log, query.userId as string)
    );
    return {
      items: history,
      pagination: { page: 1, limit: history.length || 1, total: history.length, totalPages: 1 },
    };
  }

  const offset = (query.page - 1) * query.limit;
  const cacheKey = buildCacheKey(CACHE_NAMESPACE.SALARIES, "list", requester.role, query.page, query.limit);
  const { rows, count } = await withCache(log, cacheKey, async () => {
    const result = await salaryRepository.findAndCountCurrent(log, { limit: query.limit, offset });
    if (requester.role === ROLE_NAMES.HR) {
      const filtered = result.rows.filter((row) => row.user?.role?.name === ROLE_NAMES.EMPLOYEE);
      return { rows: filtered, count: filtered.length };
    }
    return result;
  });

  return {
    items: rows,
    pagination: { page: query.page, limit: query.limit, total: count, totalPages: Math.ceil(count / query.limit) || 1 },
  };
}

export async function getSalaryById(logger: Logger, requester: RequestingUser, id: string): Promise<Salary> {
  const log = scopedLogger(logger, LAYER, "getSalaryById");
  const salary = await withCache(log, buildCacheKey(CACHE_NAMESPACE.SALARIES, "byId", id), async () => {
    const row = await salaryRepository.findById(log, id);
    if (!row) throw new NotFoundError("Salary not found");
    return row;
  });
  if (!salary.user) {
    const user = await userRepository.findById(log, salary.userId);
    if (!user) throw new NotFoundError("User not found");
    assertCanAccessEmployee(requester, user);
  } else {
    assertCanAccessEmployee(requester, salary.user);
  }
  return salary;
}

export async function getSalaryHistory(
  logger: Logger,
  requester: RequestingUser,
  userId: string
): Promise<Salary[]> {
  const log = scopedLogger(logger, LAYER, "getSalaryHistory");
  const user = await userRepository.findById(log, userId);
  if (!user) throw new NotFoundError("User not found");
  assertCanAccessEmployee(requester, user);
  return withCache(log, buildCacheKey(CACHE_NAMESPACE.SALARIES, "history", userId), () =>
    salaryRepository.findHistoryForUser(log, userId)
  );
}

export async function generatePayslip(
  logger: Logger,
  requester: RequestingUser,
  input: GeneratePayslipInput
): Promise<Payslip> {
  const log = scopedLogger(logger, LAYER, "generatePayslip");
  assertCanMutateSalary(requester);

  const user = await userRepository.findById(log, input.userId);
  if (!user) throw new NotFoundError("User not found");
  assertCanAccessEmployee(requester, user);

  const existing = await payslipRepository.findByUserYearMonth(log, input.userId, input.year, input.month);
  if (existing) {
    throw new ConflictError(`A payslip for ${input.year}-${String(input.month).padStart(2, "0")} already exists`);
  }

  const periodDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
  const salary = await salaryRepository.findForUserOnDate(log, input.userId, periodDate);
  if (!salary) {
    throw new BadRequestError("No salary package covers that month for this employee");
  }

  const pay = computePayComponents(
    parseMoney(salary.baseSalary),
    parseMoney(salary.allowances),
    parseMoney(salary.deductions)
  );

  const payslip = await payslipRepository.create(log, {
    userId: input.userId,
    salaryId: salary.id,
    year: input.year,
    month: input.month,
    currency: salary.currency,
    baseSalary: pay.baseSalary,
    allowances: pay.allowances,
    deductions: pay.deductions,
    gross: pay.gross,
    net: pay.net,
    generatedBy: requester.userId,
  });

  await invalidateNamespace(log, CACHE_NAMESPACE.PAYSLIPS);
  log.info({ id: payslip.id }, "Generate payslip - completed");
  return payslip;
}

export async function listPayslips(
  logger: Logger,
  requester: RequestingUser,
  query: ListPayslipsQuery
): Promise<{ items: Payslip[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const log = scopedLogger(logger, LAYER, "listPayslips");
  const where: Record<string, unknown> = {};
  if (requester.role === ROLE_NAMES.EMPLOYEE) {
    where.userId = requester.userId;
  } else if (query.userId) {
    const user = await userRepository.findById(log, query.userId);
    if (!user) throw new NotFoundError("User not found");
    assertCanAccessEmployee(requester, user);
    where.userId = query.userId;
  }
  if (query.year !== undefined) where.year = query.year;
  if (query.month !== undefined) where.month = query.month;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await withCache(
    log,
    buildCacheKey(
      CACHE_NAMESPACE.PAYSLIPS,
      "list",
      requester.role,
      query.page,
      query.limit,
      query.userId,
      query.year,
      query.month
    ),
    () => payslipRepository.findAndCountAll(log, { where, limit: query.limit, offset })
  );

  const items =
    requester.role === ROLE_NAMES.HR
      ? rows.filter((row) => !row.user || row.user.role?.name === ROLE_NAMES.EMPLOYEE)
      : rows;

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count,
      totalPages: Math.ceil(count / query.limit) || 1,
    },
  };
}

export type { AnalyticsBucket };

export interface SalaryAnalytics {
  groupBy: SalaryAnalyticsQuery["groupBy"];
  totalEmployeesOnPayroll: number;
  buckets: AnalyticsBucket[];
}

export async function getSalaryAnalytics(
  logger: Logger,
  requester: RequestingUser,
  query: SalaryAnalyticsQuery
): Promise<SalaryAnalytics> {
  const log = scopedLogger(logger, LAYER, "getSalaryAnalytics");
  if (requester.role === ROLE_NAMES.EMPLOYEE) {
    throw new ForbiddenError("Only Admin or HR can view payroll analytics");
  }

  const rows = await withCache(
    log,
    buildCacheKey(CACHE_NAMESPACE.SALARIES, "analytics", requester.role, query.groupBy),
    async () => {
      const all = await salaryRepository.findAllCurrentWithUsers(log);
      return requester.role === ROLE_NAMES.HR
        ? all.filter((row) => row.user?.role?.name === ROLE_NAMES.EMPLOYEE)
        : all;
    }
  );

  const buckets = aggregateSalaryBuckets(rows, query.groupBy);

  return {
    groupBy: query.groupBy,
    totalEmployeesOnPayroll: rows.length,
    buckets,
  };
}

export function analyticsToCsv(analytics: SalaryAnalytics): string {
  return analyticsBucketsToCsv(analytics.buckets);
}
