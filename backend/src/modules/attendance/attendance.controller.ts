import type { FastifyReply, FastifyRequest } from "fastify";
import {
  listAttendanceQuerySchema,
  listCorrectionsQuerySchema,
  markAttendanceSchema,
  requestCorrectionSchema,
  reviewCorrectionSchema,
} from "./attendance.validation";
import * as attendanceService from "./attendance.service";
import { sendValidationError } from "../../utils/validation";
import { successResponse } from "../../utils/response";
import { scopedLogger } from "../../utils/scoped-logger";
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
