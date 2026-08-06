import { AttendanceCorrectionRequest, Role, User, Attendance } from "../models";
import type { AttendanceStatus, CorrectionStatus, Workday } from "../constants/attendance";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "AttendanceCorrectionRepository";
// Nests the requester's role so services can enforce "HR may only review
// Employee requests" without an extra query.
const withRelations = {
  include: [
    { model: User, as: "requester" as const, include: [{ model: Role, as: "role" as const }] },
    { model: User, as: "reviewer" as const },
    { model: Attendance, as: "attendance" as const },
  ],
};

export interface CreateCorrectionRow {
  userId: string;
  attendanceId: string | null;
  requestedDate: string;
  requestedDay: Workday;
  requestedStatus: AttendanceStatus;
  requestedCheckInTime?: Date | null;
  requestedCheckOutTime?: Date | null;
  requestedWorkingHours?: number | null;
  reason?: string | null;
}

export interface FindCorrectionsOptions {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export async function create(logger: Logger, data: CreateCorrectionRow): Promise<AttendanceCorrectionRequest> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info({ userId: data.userId, requestedDate: data.requestedDate }, "Create correction request - inserting into database");
  const request = await AttendanceCorrectionRequest.create(data);
  log.info({ id: request.id }, "Create correction request - insert completed");
  return request;
}

export async function findById(logger: Logger, id: string): Promise<AttendanceCorrectionRequest | null> {
  const log = scopedLogger(logger, LAYER, "findById");
  log.info({ id }, "Find correction request by id - querying database");
  const request = await AttendanceCorrectionRequest.findByPk(id, withRelations);
  log.info({ id, found: Boolean(request) }, "Find correction request by id - completed");
  return request;
}

export async function findAndCountAll(
  logger: Logger,
  options: FindCorrectionsOptions
): Promise<{ rows: AttendanceCorrectionRequest[]; count: number }> {
  const log = scopedLogger(logger, LAYER, "findAndCountAll");
  log.info(
    { where: options.where, limit: options.limit, offset: options.offset },
    "List correction requests - querying database"
  );
  const result = await AttendanceCorrectionRequest.findAndCountAll({
    where: options.where,
    limit: options.limit,
    offset: options.offset,
    include: withRelations.include,
    order: [["createdAt", "DESC"]],
  });
  log.info({ count: result.count }, "List correction requests - query completed");
  return result;
}

export async function save(logger: Logger, request: AttendanceCorrectionRequest): Promise<AttendanceCorrectionRequest> {
  const log = scopedLogger(logger, LAYER, "save");
  log.info({ id: request.id }, "Save correction request - persisting changes");
  await request.save();
  log.info({ id: request.id }, "Save correction request - changes persisted");
  return request;
}

export type { CorrectionStatus };
