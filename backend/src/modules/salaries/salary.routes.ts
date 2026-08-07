import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/rbac";
import { checkPermission } from "../../middleware/permission-guard";
import { ROLE_NAMES } from "../../constants/roles";
import type { IdParams } from "../../types/route.types";
import {
  createSalaryHandler,
  generatePayslipHandler,
  getSalaryHandler,
  getSalaryHistoryHandler,
  listPayslipsHandler,
  listSalariesHandler,
  salaryAnalyticsHandler,
} from "./salary.controller";

export async function salaryRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", checkPermission);

  // Static paths before "/:id"
  app.get(
    "/analytics",
    { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR) },
    salaryAnalyticsHandler
  );
  app.get<{ Params: { userId: string } }>(
    "/history/:userId",
    { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE) },
    getSalaryHistoryHandler
  );
  app.get(
    "/payslips",
    { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE) },
    listPayslipsHandler
  );
  app.post(
    "/payslips",
    { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR) },
    generatePayslipHandler
  );

  app.post("/", { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR) }, createSalaryHandler);
  app.get("/", { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE) }, listSalariesHandler);
  app.get<{ Params: IdParams }>(
    "/:id",
    { preHandler: requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.HR, ROLE_NAMES.EMPLOYEE) },
    getSalaryHandler
  );
}
