import cron, { type ScheduledTask } from "node-cron";
import { env } from "../config/env";
import * as attendanceService from "../modules/attendance/attendance.service";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "AttendanceAbsenceMarkerJob";
// 19:00, Monday-Friday.
const CRON_EXPRESSION = "0 19 * * 1-5";

/** Marks every active user with no attendance row today as ABSENT and emails them. See `attendanceService.autoMarkAbsentees`. */
export function scheduleAttendanceAbsenceMarkerJob(logger: Logger): ScheduledTask {
  const log = scopedLogger(logger, LAYER, "scheduleAttendanceAbsenceMarkerJob");

  const task = cron.schedule(
    CRON_EXPRESSION,
    async () => {
      const runLog = scopedLogger(logger, LAYER, "run");
      runLog.info("Attendance absence-marker job - run started");
      try {
        const result = await attendanceService.autoMarkAbsentees(runLog);
        runLog.info(result, "Attendance absence-marker job - run completed");
      } catch (error) {
        runLog.error({ err: error }, "Attendance absence-marker job - run failed");
      }
    },
    { timezone: env.cronTimezone, name: "attendance-absence-marker", noOverlap: true }
  );

  log.info({ cron: CRON_EXPRESSION, timezone: env.cronTimezone }, "Attendance absence-marker job - scheduled");
  return task;
}
