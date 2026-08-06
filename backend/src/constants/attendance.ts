export const WORKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
export type Workday = (typeof WORKDAYS)[number];

export const CORRECTION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type CorrectionStatus = (typeof CORRECTION_STATUS)[keyof typeof CORRECTION_STATUS];

/**
 * What a given weekday's attendance row represents. Every Mon-Fri needs one
 * of these — attendance is mandatory, there's no "no record" state once a
 * day has been accounted for:
 * - PRESENT: employee checked in (optionally checked out), times recorded.
 * - ABSENT: employee (or a backfilled claim) marks the day as an absence — no times.
 * - HOLIDAY: the day is a declared holiday — only ever set via an
 *   HR/Admin-approved claim, never self-declared directly.
 */
export const ATTENDANCE_STATUS = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  HOLIDAY: "HOLIDAY",
} as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];
