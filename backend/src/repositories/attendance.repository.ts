import { Attendance, Role, User } from "../models";
import type { AttendanceStatus, Workday } from "../constants/attendance";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "AttendanceRepository";
// Nests the user's role so callers (services) can make role-based access
// decisions (e.g. "HR may only view Employee records") without another query.
const withUser = {
  include: [{ model: User, as: "user" as const, include: [{ model: Role, as: "role" as const }] }],
};

export interface CreateAttendanceRow {
  userId: string;
  date: string;
  day: Workday;
  status: AttendanceStatus;
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
  workingHours?: number | null;
}

export interface FindAttendanceOptions {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export async function findByUserAndDate(logger: Logger, userId: string, date: string): Promise<Attendance | null> {
  const log = scopedLogger(logger, LAYER, "findByUserAndDate");
  log.info({ userId, date }, "Find attendance by user and date - querying database");
  const attendance = await Attendance.findOne({ where: { userId, date } });
  log.info({ userId, date, found: Boolean(attendance) }, "Find attendance by user and date - completed");
  return attendance;
}

export async function findById(logger: Logger, id: string): Promise<Attendance | null> {
  const log = scopedLogger(logger, LAYER, "findById");
  log.info({ id }, "Find attendance by id - querying database");
  const attendance = await Attendance.findByPk(id, withUser);
  log.info({ id, found: Boolean(attendance) }, "Find attendance by id - completed");
  return attendance;
}

export async function create(logger: Logger, data: CreateAttendanceRow): Promise<Attendance> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info({ userId: data.userId, date: data.date }, "Create attendance - inserting into database");
  const attendance = await Attendance.create(data);
  log.info({ id: attendance.id }, "Create attendance - insert completed");
  return attendance;
}

export async function save(logger: Logger, attendance: Attendance): Promise<Attendance> {
  const log = scopedLogger(logger, LAYER, "save");
  log.info({ id: attendance.id }, "Save attendance - persisting changes");
  await attendance.save();
  log.info({ id: attendance.id }, "Save attendance - changes persisted");
  return attendance;
}

export async function findAndCountAll(
  logger: Logger,
  options: FindAttendanceOptions
): Promise<{ rows: Attendance[]; count: number }> {
  const log = scopedLogger(logger, LAYER, "findAndCountAll");
  log.info({ where: options.where, limit: options.limit, offset: options.offset }, "List attendance - querying database");
  const result = await Attendance.findAndCountAll({
    where: options.where,
    limit: options.limit,
    offset: options.offset,
    include: withUser.include,
    order: [["date", "DESC"]],
  });
  log.info({ count: result.count }, "List attendance - query completed");
  return result;
}
