import type { ScheduledTask } from "node-cron";
import { env } from "../config/env";
import { scheduleAttendanceReminderJob } from "./attendance-reminder.job";
import { scheduleAttendanceAbsenceMarkerJob } from "./attendance-absence-marker.job";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "CronJobs";

/** Schedules all recurring jobs. Returns the handles so `stopCronJobs` can cleanly stop them on shutdown. Respects `ENABLE_CRON_JOBS=false`. */
export function startCronJobs(logger: Logger): ScheduledTask[] {
  const log = scopedLogger(logger, LAYER, "startCronJobs");

  if (!env.enableCronJobs) {
    log.info("Start cron jobs - skipped, ENABLE_CRON_JOBS is false");
    return [];
  }

  log.info("Start cron jobs - scheduling all jobs");
  const tasks = [scheduleAttendanceReminderJob(logger), scheduleAttendanceAbsenceMarkerJob(logger)];
  log.info({ count: tasks.length }, "Start cron jobs - all jobs scheduled");
  return tasks;
}

export async function stopCronJobs(logger: Logger, tasks: ScheduledTask[]): Promise<void> {
  const log = scopedLogger(logger, LAYER, "stopCronJobs");
  await Promise.all(tasks.map((task) => task.stop()));
  log.info({ count: tasks.length }, "Stop cron jobs - all jobs stopped");
}
