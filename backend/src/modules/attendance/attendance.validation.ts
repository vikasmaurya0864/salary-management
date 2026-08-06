import { z } from "zod";
import { ATTENDANCE_STATUS } from "../../constants/attendance";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format");

// Marking attendance is an upsert against TODAY only (enforced in the
// service, never trusting `date` alone) — first call of the day creates the
// row (PRESENT with check-in, or a direct ABSENT), a later PRESENT call the
// same day fills in the check-out.
export const markAttendanceSchema = z
  .object({
    date: dateOnly,
    status: z.enum([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT]).default(ATTENDANCE_STATUS.PRESENT),
    checkInTime: z.coerce.date().optional(),
    checkOutTime: z.coerce.date().optional(),
    workingHours: z.coerce.number().positive().max(24).optional(),
  })
  .refine(
    (data) => data.status !== ATTENDANCE_STATUS.PRESENT || data.checkInTime !== undefined || data.checkOutTime !== undefined,
    { message: "At least one of checkInTime or checkOutTime is required when marking present" }
  )
  .refine(
    (data) =>
      data.status !== ATTENDANCE_STATUS.ABSENT ||
      (data.checkInTime === undefined && data.checkOutTime === undefined && data.workingHours === undefined),
    { message: "checkInTime/checkOutTime/workingHours are not applicable when marking absent" }
  );
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const listAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  userId: z.string().uuid().optional(),
  date: dateOnly.optional(),
  status: z.enum([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT, ATTENDANCE_STATUS.HOLIDAY]).optional(),
});
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;

// A "claim" raised by an employee against a date that's already in the
// past (or, for ABSENT/HOLIDAY, today) — nothing here touches the
// `attendances` table directly; it only ever lands in
// `attendance_correction_requests` until HR/Admin approves it.
export const requestCorrectionSchema = z
  .object({
    date: dateOnly,
    requestedStatus: z
      .enum([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT, ATTENDANCE_STATUS.HOLIDAY])
      .default(ATTENDANCE_STATUS.PRESENT),
    checkInTime: z.coerce.date().optional(),
    checkOutTime: z.coerce.date().optional(),
    workingHours: z.coerce.number().positive().max(24).optional(),
    reason: z.string().trim().min(1, "reason is required").max(500),
  })
  .refine((data) => data.requestedStatus !== ATTENDANCE_STATUS.PRESENT || data.checkInTime !== undefined, {
    message: "checkInTime is required for a present-day time correction claim",
  })
  .refine(
    (data) =>
      data.requestedStatus === ATTENDANCE_STATUS.PRESENT ||
      (data.checkInTime === undefined && data.checkOutTime === undefined && data.workingHours === undefined),
    { message: "checkInTime/checkOutTime/workingHours are not applicable for absent/holiday claims" }
  );
export type RequestCorrectionInput = z.infer<typeof requestCorrectionSchema>;

export const listCorrectionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
export type ListCorrectionsQuery = z.infer<typeof listCorrectionsQuerySchema>;

export const reviewCorrectionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().trim().max(500).optional(),
});
export type ReviewCorrectionInput = z.infer<typeof reviewCorrectionSchema>;
