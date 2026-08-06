import type { Workday } from "../constants/attendance";

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

// NOTE: "today"/"day of week" here are computed in UTC. For a single-region
// deployment you may want to shift this to a specific business timezone
// instead — kept simple/consistent for now.

/** `YYYY-MM-DD` for a Date, matching Sequelize's `DATEONLY` string format. */
export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Server's current calendar date (UTC) — attendance is always marked against this, never a client-supplied date. */
export function getTodayDateOnly(): string {
  return toDateOnly(new Date());
}

export function getDayName(date: Date): (typeof DAY_NAMES)[number] {
  return DAY_NAMES[date.getUTCDay()] as (typeof DAY_NAMES)[number];
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday, Saturday
}

/** `getDayName`, narrowed to Mon-Fri. Callers must already know `date` isn't a weekend (via `isWeekend`). */
export function getWorkday(date: Date): Workday {
  return getDayName(date) as Workday;
}

/**
 * Hours between two timestamps, rounded to 2 decimal places. Returns `null`
 * if `checkOut` is missing or not after `checkIn` (e.g. still checked in, or
 * bad data) so callers can decide whether that's an error or just "not done yet".
 */
export function calculateWorkingHours(checkIn: Date, checkOut: Date | null): number | null {
  if (!checkOut || checkOut.getTime() <= checkIn.getTime()) {
    return null;
  }
  const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/** First and last calendar day (`YYYY-MM-DD`) of a given month/year, e.g. for report date-range queries. `month` is 1-12. */
export function monthDateRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // day 0 of next month == last day of this month
  return { start: toDateOnly(start), end: toDateOnly(end) };
}

/** Number of Mon-Fri days between two `YYYY-MM-DD` dates (inclusive) — i.e. how many attendance rows a month *should* have. */
export function countWeekdaysInRange(startDate: string, endDate: string): number {
  let count = 0;
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    if (!isWeekend(cursor)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Sortable `year*12+month` key so two (year, month) pairs can be compared with plain `<`/`>`. `month` is 1-12. */
export function monthKey(year: number, month: number): number {
  return year * 12 + (month - 1);
}
