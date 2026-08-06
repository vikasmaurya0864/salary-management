import type { FastifyReply, FastifyRequest } from "fastify";
import {
  attendanceReportQuerySchema,
  listAttendanceQuerySchema,
  listCorrectionsQuerySchema,
  markAttendanceSchema,
  requestCorrectionSchema,
  reviewCorrectionSchema,
} from "./attendance.validation";
import * as attendanceService from "./attendance.service";
import type { AttendanceReport } from "./attendance.service";
import { sendValidationError } from "../../utils/validation";
import { successResponse } from "../../utils/response";
import { scopedLogger } from "../../utils/scoped-logger";
import { toCsv } from "../../utils/csv";
import type { IdParams } from "../../types/route.types";

const LAYER = "AttendanceController";

function requestingUser(request: FastifyRequest) {
  return { userId: request.user.userId, role: request.user.role };
}

export async function markAttendanceHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "markAttendanceHandler");
  log.info("Mark attendance - request received");

  const parsed = markAttendanceSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const attendance = await attendanceService.markAttendance(log, requestingUser(request), parsed.data);

  log.info({ id: attendance.id }, "Mark attendance - request completed");
  return reply.status(200).send(successResponse(attendance));
}

export async function listAttendanceHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "listAttendanceHandler");
  log.info("List attendance - request received");

  const parsed = listAttendanceQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const result = await attendanceService.listAttendance(log, requestingUser(request), parsed.data);

  log.info({ total: result.pagination.total }, "List attendance - request completed");
  return reply.send(successResponse(result));
}

export async function getAttendanceHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "getAttendanceHandler");
  log.info({ id: request.params.id }, "Get attendance - request received");

  const attendance = await attendanceService.getAttendanceById(log, requestingUser(request), request.params.id);

  log.info({ id: request.params.id }, "Get attendance - request completed");
  return reply.send(successResponse(attendance));
}

/** Renders a report as a downloadable CSV: a couple of title rows, the daily records, then a summary block. */
function buildAttendanceReportCsv(report: AttendanceReport): string {
  const rows: unknown[][] = [
    [`Attendance Report - ${report.user.firstName} ${report.user.lastName} (${report.user.email})`],
    [`Month/Year: ${String(report.month).padStart(2, "0")}/${report.year}`],
    [],
    ["Date", "Day", "Status", "Check In", "Check Out", "Working Hours"],
    ...report.records.map((r) => [
      r.date,
      r.day,
      r.status,
      r.checkInTime ? r.checkInTime.toISOString() : "",
      r.checkOutTime ? r.checkOutTime.toISOString() : "",
      r.workingHours ?? "",
    ]),
    [],
    ["Summary"],
    ["Total Weekdays", report.summary.totalWeekdays],
    ["Present", report.summary.presentDays],
    ["Absent", report.summary.absentDays],
    ["Holiday", report.summary.holidayDays],
    ["Unmarked", report.summary.unmarkedDays],
    ["Total Working Hours", report.summary.totalWorkingHours],
  ];
  return toCsv(rows);
}

export async function getAttendanceReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "getAttendanceReportHandler");
  log.info("Get attendance report - request received");

  const parsed = attendanceReportQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const report = await attendanceService.getAttendanceReport(log, requestingUser(request), parsed.data);

  if (parsed.data.format === "json") {
    log.info({ targetUserId: report.user.id }, "Get attendance report - request completed (json)");
    return reply.send(successResponse(report));
  }

  const csv = buildAttendanceReportCsv(report);
  const filename = `attendance-report-${report.user.id}-${report.year}-${String(report.month).padStart(2, "0")}.csv`;
  log.info({ targetUserId: report.user.id, filename }, "Get attendance report - request completed (csv)");
  return reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="${filename}"`)
    .send(csv);
}

export async function requestCorrectionHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "requestCorrectionHandler");
  log.info("Request correction - request received");

  const parsed = requestCorrectionSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const correction = await attendanceService.requestCorrection(log, requestingUser(request), parsed.data);

  log.info({ id: correction.id }, "Request correction - request completed");
  return reply.status(201).send(successResponse(correction));
}

export async function listCorrectionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "listCorrectionsHandler");
  log.info("List correction requests - request received");

  const parsed = listCorrectionsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const result = await attendanceService.listCorrectionRequests(log, requestingUser(request), parsed.data);

  log.info({ total: result.pagination.total }, "List correction requests - request completed");
  return reply.send(successResponse(result));
}

export async function getCorrectionHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "getCorrectionHandler");
  log.info({ id: request.params.id }, "Get correction request - request received");

  const correction = await attendanceService.getCorrectionById(log, requestingUser(request), request.params.id);

  log.info({ id: request.params.id }, "Get correction request - request completed");
  return reply.send(successResponse(correction));
}

export async function reviewCorrectionHandler(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
  const log = scopedLogger(request.log, LAYER, "reviewCorrectionHandler");
  log.info({ id: request.params.id }, "Review correction request - request received");

  const parsed = reviewCorrectionSchema.safeParse(request.body);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const correction = await attendanceService.reviewCorrectionRequest(
    log,
    requestingUser(request),
    request.params.id,
    parsed.data
  );

  log.info({ id: request.params.id, status: correction.status }, "Review correction request - request completed");
  return reply.send(successResponse(correction));
}
