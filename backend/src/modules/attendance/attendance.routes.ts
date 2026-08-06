import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/rbac";
import { checkPermission } from "../../middleware/permission-guard";
import { ROLE_NAMES } from "../../constants/roles";
import type { IdParams } from "../../types/route.types";
import {
  getAttendanceHandler,
  getAttendanceReportHandler,
  getCorrectionHandler,
  listAttendanceHandler,
  listCorrectionsHandler,
  markAttendanceHandler,
  requestCorrectionHandler,
  reviewCorrectionHandler,
} from "./attendance.controller";

/**
 * All routes require a valid JWT. Every role (Admin/HR/Employee) can mark
 * and view their OWN attendance; only Admin/HR can list across users or
 * review correction requests — fine-grained scoping (e.g. "HR sees only
 * Employees") lives in `attendance.service.ts`.
 */
export async function attendanceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", checkPermission);

  // Mark today's attendance (check-in, and later the same day, check-out).
  app.post("/", markAttendanceHandler);

  // List attendance — own records for Employee, Employee records for HR, all for Admin.
  app.get("/", listAttendanceHandler);

  // Downloadable monthly report (CSV by default, or ?format=json). Employees: own only,
  // past 6 months. HR/Admin: any user, bounded only by that user's account-creation month.
  app.get("/report", getAttendanceReportHandler);

  // Raise a correction request for a past date ("query" awaiting Admin/HR approval).
  app.post("/corrections", requestCorrectionHandler);
  app.get("/corrections", listCorrectionsHandler);
  app.get<{ Params: IdParams }>("/corrections/:id", getCorrectionHandler);
  app.patch<{ Params: IdParams }>(
    "/corrections/:id/review",
    { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR) },
    reviewCorrectionHandler
  );

  app.get<{ Params: IdParams }>("/:id", getAttendanceHandler);
}
