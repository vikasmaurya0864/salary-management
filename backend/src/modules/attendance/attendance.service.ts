import { Op } from "sequelize";
import type { Attendance, AttendanceCorrectionRequest } from "../../models";
import * as attendanceRepository from "../../repositories/attendance.repository";
import * as correctionRepository from "../../repositories/attendance-correction.repository";
import * as userRepository from "../../repositories/user.repository";
import * as roleRepository from "../../repositories/role.repository";
import { ROLE_NAMES, type RoleName } from "../../constants/roles";
import { ATTENDANCE_STATUS, CORRECTION_STATUS } from "../../constants/attendance";
import { AppError, BadRequestError, ForbiddenError, NotFoundError } from "../../utils/app-error";
import type { Logger } from "../../utils/logger";
import { scopedLogger } from "../../utils/scoped-logger";
import { sendMail } from "../../utils/mailer";
import { calculateWorkingHours, getTodayDateOnly, getWorkday, isWeekend, toDateOnly } from "../../utils/date";
import type {
  ListAttendanceQuery,
  ListCorrectionsQuery,
  MarkAttendanceInput,
  RequestCorrectionInput,
  ReviewCorrectionInput,
} from "./attendance.validation";

const LAYER = "AttendanceService";

interface RequestingUser {
  userId: string;
  role: RoleName;
}

function dateStringToUtcMidnight(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function assertTimestampOnDate(label: string, timestamp: Date, dateStr: string): void {
  if (toDateOnly(timestamp) !== dateStr) {
    throw new BadRequestError(`${label} must fall on ${dateStr}`);
  }
}

async function getEmployeeRoleOrThrow(logger: Logger) {
  const role = await roleRepository.findByName(logger, ROLE_NAMES.EMPLOYEE);
  if (!role) {
    throw new AppError("Role 'EMPLOYEE' is not configured. Run the database seeders.", 500, "ROLE_NOT_CONFIGURED");
  }
  return role;
}

// ---------------------------------------------------------------------------
// Mark attendance (today only — the whole point being it's impossible to
// create/modify a past-dated row through this path).
// ---------------------------------------------------------------------------

export async function markAttendance(
  logger: Logger,
  requester: RequestingUser,
  input: MarkAttendanceInput
): Promise<Attendance> {
  const log = scopedLogger(logger, LAYER, "markAttendance");
  log.info({ userId: requester.userId, date: input.date }, "Mark attendance - processing");

  const today = getTodayDateOnly();
  if (input.date !== today) {
    log.warn({ date: input.date, today }, "Mark attendance - rejected, not today's date");
    throw new BadRequestError(
      "Attendance can only be marked for today's date. Raise a correction request for past dates."
    );
  }

  const dayDate = dateStringToUtcMidnight(input.date);
  if (isWeekend(dayDate)) {
    log.warn({ date: input.date }, "Mark attendance - rejected, weekend");
    throw new BadRequestError("Attendance can only be marked Monday through Friday");
  }
  const day = getWorkday(dayDate);

  if (input.checkInTime) assertTimestampOnDate("checkInTime", input.checkInTime, input.date);
  if (input.checkOutTime) assertTimestampOnDate("checkOutTime", input.checkOutTime, input.date);

  const existing = await attendanceRepository.findByUserAndDate(log, requester.userId, input.date);

  // Self-declared ABSENT — no approval needed since it's today, not a past-date change.
  if (input.status === ATTENDANCE_STATUS.ABSENT) {
    if (!existing) {
      const attendance = await attendanceRepository.create(log, {
        userId: requester.userId,
        date: input.date,
        day,
        status: ATTENDANCE_STATUS.ABSENT,
        checkInTime: null,
        checkOutTime: null,
        workingHours: null,
      });
      log.info({ id: attendance.id }, "Mark attendance - marked absent");
      return attendance;
    }

    existing.status = ATTENDANCE_STATUS.ABSENT;
    existing.checkInTime = null;
    existing.checkOutTime = null;
    existing.workingHours = null;
    await attendanceRepository.save(log, existing);
    log.info({ id: existing.id }, "Mark attendance - updated to absent");
    return existing;
  }

  // status === PRESENT
  if (!existing || existing.status !== ATTENDANCE_STATUS.PRESENT) {
    if (!input.checkInTime) {
      log.warn({ userId: requester.userId }, "Mark attendance - rejected, first entry of the day needs checkInTime");
      throw new BadRequestError("checkInTime is required to mark attendance for the first time today");
    }
    if (input.checkOutTime && input.checkOutTime.getTime() <= input.checkInTime.getTime()) {
      throw new BadRequestError("checkOutTime must be after checkInTime");
    }

    const workingHours = input.workingHours ?? calculateWorkingHours(input.checkInTime, input.checkOutTime ?? null);

    if (!existing) {
      const attendance = await attendanceRepository.create(log, {
        userId: requester.userId,
        date: input.date,
        day,
        status: ATTENDANCE_STATUS.PRESENT,
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime ?? null,
        workingHours,
      });
      log.info({ id: attendance.id }, "Mark attendance - check-in recorded");
      return attendance;
    }

    // Switching an earlier same-day ABSENT mark back to PRESENT.
    existing.status = ATTENDANCE_STATUS.PRESENT;
    existing.checkInTime = input.checkInTime;
    existing.checkOutTime = input.checkOutTime ?? null;
    existing.workingHours = workingHours;
    await attendanceRepository.save(log, existing);
    log.info({ id: existing.id }, "Mark attendance - check-in recorded (was absent)");
    return existing;
  }

  // Already checked in today — this call can only fill in the check-out
  // (and/or working hours); the original check-in is never overwritten.
  if (input.checkOutTime) {
    if (!existing.checkInTime || input.checkOutTime.getTime() <= existing.checkInTime.getTime()) {
      throw new BadRequestError("checkOutTime must be after checkInTime");
    }
    existing.checkOutTime = input.checkOutTime;
  }
  existing.workingHours =
    input.workingHours ?? calculateWorkingHours(existing.checkInTime as Date, existing.checkOutTime);

  await attendanceRepository.save(log, existing);
  log.info({ id: existing.id }, "Mark attendance - check-out recorded");
  return existing;
}

// ---------------------------------------------------------------------------
// Read access — Admin sees everyone, HR only Employees, Employees only
// themselves. Mirrors the same rule shape as `user.service.ts`.
// ---------------------------------------------------------------------------

export interface PaginatedAttendance {
  items: Attendance[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

async function buildAttendanceWhere(
  logger: Logger,
  requester: RequestingUser,
  query: ListAttendanceQuery
): Promise<Record<string, unknown>> {
  const where: Record<string, unknown> = {};
  if (query.date) where.date = query.date;
  if (query.status) where.status = query.status;

  if (requester.role === ROLE_NAMES.EMPLOYEE) {
    where.userId = requester.userId;
    return where;
  }

  if (requester.role === ROLE_NAMES.HR) {
    const employeeRole = await getEmployeeRoleOrThrow(logger);
    const employeeIds = await userRepository.findIdsByRoleId(logger, employeeRole.id);

    if (query.userId) {
      if (!employeeIds.includes(query.userId)) {
        throw new ForbiddenError("HR can only view Employee attendance records");
      }
      where.userId = query.userId;
    } else {
      where.userId = { [Op.in]: employeeIds };
    }
    return where;
  }

  // ADMIN
  if (query.userId) where.userId = query.userId;
  return where;
}

export async function listAttendance(
  logger: Logger,
  requester: RequestingUser,
  query: ListAttendanceQuery
): Promise<PaginatedAttendance> {
  const log = scopedLogger(logger, LAYER, "listAttendance");
  log.info({ role: requester.role, page: query.page }, "List attendance - processing");

  const where = await buildAttendanceWhere(log, requester, query);
  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await attendanceRepository.findAndCountAll(log, { where, limit: query.limit, offset });

  log.info({ total: count }, "List attendance - completed");
  return {
    items: rows,
    pagination: { page: query.page, limit: query.limit, total: count, totalPages: Math.ceil(count / query.limit) || 1 },
  };
}

async function findAttendanceOrThrow(logger: Logger, id: string): Promise<Attendance> {
  const attendance = await attendanceRepository.findById(logger, id);
  if (!attendance) {
    throw new NotFoundError("Attendance record not found");
  }
  return attendance;
}

function assertCanAccessAttendance(requester: RequestingUser, attendance: Attendance): void {
  if (requester.role === ROLE_NAMES.ADMIN) return;
  if (requester.role === ROLE_NAMES.HR) {
    if (attendance.user?.role?.name === ROLE_NAMES.EMPLOYEE) return;
    throw new ForbiddenError("HR can only access Employee attendance records");
  }
  if (attendance.userId === requester.userId) return;
  throw new ForbiddenError();
}

export async function getAttendanceById(logger: Logger, requester: RequestingUser, id: string): Promise<Attendance> {
  const log = scopedLogger(logger, LAYER, "getAttendanceById");
  log.info({ id }, "Get attendance - processing");

  const attendance = await findAttendanceOrThrow(log, id);
  assertCanAccessAttendance(requester, attendance);

  log.info({ id }, "Get attendance - completed");
  return attendance;
}

// ---------------------------------------------------------------------------
// Correction requests ("raise a query") — the ONLY way a past date's
// attendance can ever change, and only after Admin/HR approval.
// ---------------------------------------------------------------------------

export async function requestCorrection(
  logger: Logger,
  requester: RequestingUser,
  input: RequestCorrectionInput
): Promise<AttendanceCorrectionRequest> {
  const log = scopedLogger(logger, LAYER, "requestCorrection");
  log.info(
    { userId: requester.userId, date: input.date, requestedStatus: input.requestedStatus },
    "Request correction - processing"
  );

  const today = getTodayDateOnly();
  const isPresentClaim = input.requestedStatus === ATTENDANCE_STATUS.PRESENT;
  // Present-day time corrections are strictly for the past (today goes
  // through mark-attendance directly). Absent/holiday claims may also cover
  // today (e.g. reclassifying today as a holiday), but never the future.
  const dateIsAllowed = isPresentClaim ? input.date < today : input.date <= today;
  if (!dateIsAllowed) {
    log.warn({ date: input.date, today, requestedStatus: input.requestedStatus }, "Request correction - rejected, invalid date");
    throw new BadRequestError(
      isPresentClaim
        ? "Present-day time correction claims are only for past dates; use the mark-attendance endpoint for today"
        : "Claims cannot be raised for future dates"
    );
  }

  const dayDate = dateStringToUtcMidnight(input.date);
  if (isWeekend(dayDate)) {
    log.warn({ date: input.date }, "Request correction - rejected, weekend");
    throw new BadRequestError("Attendance is only tracked Monday through Friday");
  }
  const day = getWorkday(dayDate);

  let requestedCheckInTime: Date | null = null;
  let requestedCheckOutTime: Date | null = null;
  let requestedWorkingHours: number | null = null;

  if (isPresentClaim) {
    // Validation guarantees checkInTime is present when requestedStatus is PRESENT.
    const checkInTime = input.checkInTime as Date;
    assertTimestampOnDate("checkInTime", checkInTime, input.date);
    if (input.checkOutTime) {
      assertTimestampOnDate("checkOutTime", input.checkOutTime, input.date);
      if (input.checkOutTime.getTime() <= checkInTime.getTime()) {
        throw new BadRequestError("checkOutTime must be after checkInTime");
      }
    }
    requestedCheckInTime = checkInTime;
    requestedCheckOutTime = input.checkOutTime ?? null;
    requestedWorkingHours = input.workingHours ?? calculateWorkingHours(checkInTime, requestedCheckOutTime);
  }

  const existingAttendance = await attendanceRepository.findByUserAndDate(log, requester.userId, input.date);

  const request = await correctionRepository.create(log, {
    userId: requester.userId,
    attendanceId: existingAttendance?.id ?? null,
    requestedDate: input.date,
    requestedDay: day,
    requestedStatus: input.requestedStatus,
    requestedCheckInTime,
    requestedCheckOutTime,
    requestedWorkingHours,
    reason: input.reason,
  });

  log.info({ id: request.id }, "Request correction - completed, pending review");
  return request;
}

export interface PaginatedCorrections {
  items: AttendanceCorrectionRequest[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listCorrectionRequests(
  logger: Logger,
  requester: RequestingUser,
  query: ListCorrectionsQuery
): Promise<PaginatedCorrections> {
  const log = scopedLogger(logger, LAYER, "listCorrectionRequests");
  log.info({ role: requester.role, page: query.page }, "List correction requests - processing");

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;

  if (requester.role === ROLE_NAMES.EMPLOYEE) {
    where.userId = requester.userId;
  } else if (requester.role === ROLE_NAMES.HR) {
    const employeeRole = await getEmployeeRoleOrThrow(log);
    const employeeIds = await userRepository.findIdsByRoleId(log, employeeRole.id);
    where.userId = { [Op.in]: employeeIds };
  }
  // ADMIN sees all.

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await correctionRepository.findAndCountAll(log, { where, limit: query.limit, offset });

  log.info({ total: count }, "List correction requests - completed");
  return {
    items: rows,
    pagination: { page: query.page, limit: query.limit, total: count, totalPages: Math.ceil(count / query.limit) || 1 },
  };
}

async function findCorrectionOrThrow(logger: Logger, id: string): Promise<AttendanceCorrectionRequest> {
  const request = await correctionRepository.findById(logger, id);
  if (!request) {
    throw new NotFoundError("Correction request not found");
  }
  return request;
}

function assertCanAccessCorrection(requester: RequestingUser, request: AttendanceCorrectionRequest): void {
  if (requester.role === ROLE_NAMES.ADMIN) return;
  if (requester.role === ROLE_NAMES.HR) {
    if (request.requester?.role?.name === ROLE_NAMES.EMPLOYEE) return;
    throw new ForbiddenError("HR can only access Employee correction requests");
  }
  if (request.userId === requester.userId) return;
  throw new ForbiddenError();
}

export async function getCorrectionById(
  logger: Logger,
  requester: RequestingUser,
  id: string
): Promise<AttendanceCorrectionRequest> {
  const log = scopedLogger(logger, LAYER, "getCorrectionById");
  log.info({ id }, "Get correction request - processing");

  const request = await findCorrectionOrThrow(log, id);
  assertCanAccessCorrection(requester, request);

  log.info({ id }, "Get correction request - completed");
  return request;
}

/**
 * Admin/HR decision on a correction request. Approving is the ONLY code
 * path that ever writes a past date into the `attendances` table — it
 * either patches the existing row or creates a new backfilled one.
 */
export async function reviewCorrectionRequest(
  logger: Logger,
  requester: RequestingUser,
  id: string,
  input: ReviewCorrectionInput
): Promise<AttendanceCorrectionRequest> {
  const log = scopedLogger(logger, LAYER, "reviewCorrectionRequest");
  log.info({ id, action: input.action }, "Review correction request - processing");

  const request = await findCorrectionOrThrow(log, id);

  if (requester.role === ROLE_NAMES.HR && request.requester?.role?.name !== ROLE_NAMES.EMPLOYEE) {
    log.warn({ id }, "Review correction request - forbidden, HR can only review Employee requests");
    throw new ForbiddenError("HR can only review Employee correction requests");
  }

  if (request.status !== CORRECTION_STATUS.PENDING) {
    log.warn({ id, status: request.status }, "Review correction request - already reviewed");
    throw new BadRequestError(`This request has already been ${request.status.toLowerCase()}`);
  }

  request.status = input.action === "APPROVE" ? CORRECTION_STATUS.APPROVED : CORRECTION_STATUS.REJECTED;
  request.reviewedBy = requester.userId;
  request.reviewedAt = new Date();
  request.reviewNote = input.reviewNote ?? null;

  if (input.action === "APPROVE") {
    if (request.attendanceId) {
      const attendance = await attendanceRepository.findById(log, request.attendanceId);
      if (attendance) {
        attendance.date = request.requestedDate;
        attendance.day = request.requestedDay;
        attendance.status = request.requestedStatus;
        attendance.checkInTime = request.requestedCheckInTime;
        attendance.checkOutTime = request.requestedCheckOutTime;
        attendance.workingHours = request.requestedWorkingHours;
        await attendanceRepository.save(log, attendance);
        log.info({ id, attendanceId: attendance.id }, "Review correction request - existing attendance row updated");
      } else {
        log.warn({ id, attendanceId: request.attendanceId }, "Review correction request - linked attendance row missing, skipping");
      }
    } else {
      const attendance = await attendanceRepository.create(log, {
        userId: request.userId,
        date: request.requestedDate,
        day: request.requestedDay,
        status: request.requestedStatus,
        checkInTime: request.requestedCheckInTime,
        checkOutTime: request.requestedCheckOutTime,
        workingHours: request.requestedWorkingHours,
      });
      log.info({ id, attendanceId: attendance.id }, "Review correction request - backfilled new attendance row");
    }
  }

  await correctionRepository.save(log, request);
  log.info({ id, status: request.status }, "Review correction request - completed");
  return request;
}

// ---------------------------------------------------------------------------
// Scheduled jobs (see src/jobs/) — run system-wide on a timer, not on
// behalf of any one requester, so there's no RBAC context here. Both skip
// entirely on weekends since attendance isn't tracked then.
// ---------------------------------------------------------------------------

export interface ReminderRunResult {
  totalActiveUsers: number;
  alreadyMarked: number;
  remindersSent: number;
  remindersFailed: number;
}

/**
 * 8am weekday job: emails every active user who hasn't yet marked *any*
 * attendance for today, nudging them to log in and do so before the 7pm
 * auto-absence job marks them ABSENT.
 */
export async function sendAttendanceReminders(logger: Logger): Promise<ReminderRunResult> {
  const log = scopedLogger(logger, LAYER, "sendAttendanceReminders");
  const today = getTodayDateOnly();

  if (isWeekend(dateStringToUtcMidnight(today))) {
    log.info({ date: today }, "Send attendance reminders - skipped, weekend");
    return { totalActiveUsers: 0, alreadyMarked: 0, remindersSent: 0, remindersFailed: 0 };
  }

  const users = await userRepository.findAllActive(log);
  let alreadyMarked = 0;
  let remindersSent = 0;
  let remindersFailed = 0;

  for (const user of users) {
    const existing = await attendanceRepository.findByUserAndDate(log, user.id, today);
    if (existing) {
      alreadyMarked += 1;
      continue;
    }

    const sent = await sendMail(log, {
      to: user.email,
      subject: "Reminder: mark your attendance for today",
      text:
        `Hi ${user.firstName},\n\n` +
        `This is a reminder to log in and mark your attendance for today (${today}). ` +
        `If it isn't marked by end of day, you will be automatically recorded as ABSENT.\n\n` +
        `— Salary Management`,
    });
    if (sent) {
      remindersSent += 1;
    } else {
      remindersFailed += 1;
    }
  }

  const result = { totalActiveUsers: users.length, alreadyMarked, remindersSent, remindersFailed };
  log.info(result, "Send attendance reminders - completed");
  return result;
}

export interface AutoAbsenceRunResult {
  totalActiveUsers: number;
  alreadyMarked: number;
  markedAbsent: number;
  notificationsFailed: number;
}

/**
 * 7pm weekday job: for every active user with NO attendance row at all for
 * today, creates one with status ABSENT (this is the "attendance is
 * mandatory every weekday" rule actually being enforced) and emails them.
 * Anyone who already has ANY row for today — PRESENT, ABSENT (self-marked),
 * or HOLIDAY — is left untouched.
 */
export async function autoMarkAbsentees(logger: Logger): Promise<AutoAbsenceRunResult> {
  const log = scopedLogger(logger, LAYER, "autoMarkAbsentees");
  const today = getTodayDateOnly();
  const dayDate = dateStringToUtcMidnight(today);

  if (isWeekend(dayDate)) {
    log.info({ date: today }, "Auto mark absentees - skipped, weekend");
    return { totalActiveUsers: 0, alreadyMarked: 0, markedAbsent: 0, notificationsFailed: 0 };
  }

  const day = getWorkday(dayDate);
  const users = await userRepository.findAllActive(log);
  let alreadyMarked = 0;
  let markedAbsent = 0;
  let notificationsFailed = 0;

  for (const user of users) {
    const existing = await attendanceRepository.findByUserAndDate(log, user.id, today);
    if (existing) {
      alreadyMarked += 1;
      continue;
    }

    const attendance = await attendanceRepository.create(log, {
      userId: user.id,
      date: today,
      day,
      status: ATTENDANCE_STATUS.ABSENT,
      checkInTime: null,
      checkOutTime: null,
      workingHours: null,
    });
    markedAbsent += 1;
    log.info({ userId: user.id, attendanceId: attendance.id }, "Auto mark absentees - marked user absent");

    const sent = await sendMail(log, {
      to: user.email,
      subject: `You've been marked absent for ${today}`,
      text:
        `Hi ${user.firstName},\n\n` +
        `Our records show attendance was not marked for you today (${today}). ` +
        `You have been automatically recorded as ABSENT.\n\n` +
        `If this is incorrect (e.g. approved leave or a holiday), please raise a correction ` +
        `request once you're back so HR/Admin can review and fix it.\n\n` +
        `— Salary Management`,
    });
    if (!sent) {
      notificationsFailed += 1;
    }
  }

  const result = { totalActiveUsers: users.length, alreadyMarked, markedAbsent, notificationsFailed };
  log.info(result, "Auto mark absentees - completed");
  return result;
}
