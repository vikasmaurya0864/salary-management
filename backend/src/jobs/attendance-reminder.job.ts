import cron, { type ScheduledTask } from "node-cron";
import { env } from "../config/env";
import * as attendanceService from "../modules/attendance/attendance.service";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "AttendanceReminderJob";
// 08:00, Monday-Friday.
const CRON_EXPRESSION = "0 8 * * 1-5";

/** Nudges every active user who hasn't marked today's attendance yet. See `attendanceService.sendAttendanceReminders`. */
export function scheduleAttendanceReminderJob(logger: Logger): ScheduledTask {
  const log = scopedLogger(logger, LAYER, "scheduleAttendanceReminderJob");

  const task = cron.schedule(
    CRON_EXPRESSION,
    async () => {
      const runLog = scopedLogger(logger, LAYER, "run");
      runLog.info("Attendance reminder job - run started");
      try {
        const result = await attendanceService.sendAttendanceReminders(runLog);
        runLog.info(result, "Attendance reminder job - run completed");
      } catch (error) {
        runLog.error({ err: error }, "Attendance reminder job - run failed");
      }
    },
    { timezone: env.cronTimezone, name: "attendance-reminder", noOverlap: true }
  );

  log.info({ cron: CRON_EXPRESSION, timezone: env.cronTimezone }, "Attendance reminder job - scheduled");
  return task;
}
