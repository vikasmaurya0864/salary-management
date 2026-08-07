import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createSalarySchema,
  generatePayslipSchema,
  listPayslipsQuerySchema,
  listSalariesQuerySchema,
  salaryAnalyticsQuerySchema,
} from "./salary.validation";
import * as salaryService from "./salary.service";
import { sendValidationError } from "../../utils/validation";
import { successResponse } from "../../utils/response";
import { scopedLogger } from "../../utils/scoped-logger";
import type { IdParams } from "../../types/route.types";

const LAYER = "SalaryController";

function requesterOf(request: FastifyRequest) {
  return { userId: request.user.userId, role: request.user.role };
}

export async function createSalaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "createSalaryHandler");
  const parsed = createSalarySchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(reply, parsed.error);
  const salary = await salaryService.createSalary(log, requesterOf(request), parsed.data);
  return reply.status(201).send(successResponse(salary));
}

export async function listSalariesHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "listSalariesHandler");
  const parsed = listSalariesQuerySchema.safeParse(request.query);
  if (!parsed.success) return sendValidationError(reply, parsed.error);
  const result = await salaryService.listCurrentSalaries(log, requesterOf(request), parsed.data);
  return reply.send(successResponse(result));
}

export async function getSalaryHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "getSalaryHandler");
  const salary = await salaryService.getSalaryById(log, requesterOf(request), request.params.id);
  return reply.send(successResponse(salary));
}

export async function getSalaryHistoryHandler(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
) {
  const log = scopedLogger(request.log, LAYER, "getSalaryHistoryHandler");
  const history = await salaryService.getSalaryHistory(log, requesterOf(request), request.params.userId);
  return reply.send(successResponse(history));
}

export async function generatePayslipHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "generatePayslipHandler");
  const parsed = generatePayslipSchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(reply, parsed.error);
  const payslip = await salaryService.generatePayslip(log, requesterOf(request), parsed.data);
  return reply.status(201).send(successResponse(payslip));
}

export async function listPayslipsHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "listPayslipsHandler");
  const parsed = listPayslipsQuerySchema.safeParse(request.query);
  if (!parsed.success) return sendValidationError(reply, parsed.error);
  const result = await salaryService.listPayslips(log, requesterOf(request), parsed.data);
  return reply.send(successResponse(result));
}

export async function salaryAnalyticsHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "salaryAnalyticsHandler");
  const parsed = salaryAnalyticsQuerySchema.safeParse(request.query);
  if (!parsed.success) return sendValidationError(reply, parsed.error);

  const analytics = await salaryService.getSalaryAnalytics(log, requesterOf(request), parsed.data);
  if (parsed.data.format === "csv") {
    const csv = salaryService.analyticsToCsv(analytics);
    void reply.header("Content-Type", "text/csv; charset=utf-8");
    void reply.header("Content-Disposition", `attachment; filename="payroll-analytics-${parsed.data.groupBy}.csv"`);
    return reply.send(csv);
  }
  return reply.send(successResponse(analytics));
}
