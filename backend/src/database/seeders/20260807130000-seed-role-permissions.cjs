"use strict";

/**
 * Default ACTIVE grants so HR and Employee can use the product without
 * Admin hand-creating every row. Idempotent: skips path+method already
 * granted to that role. createdBy is the bootstrap admin when present.
 */
const ROLE_IDS = {
  ADMIN: "4ed6e802-9d78-4745-8229-cfa74da6d83b",
  HR: "417ad2b4-9377-457c-bee6-f53df28f1b29",
  EMPLOYEE: "7bd849d0-edc9-481d-9834-2d2c475aaa01",
};
const ADMIN_USER_ID = "6d25db8b-6aec-47a5-b6ce-a04d0aa977b6";

const { randomUUID } = require("crypto");

const HR_GRANTS = [
  ["GET", "/api/users"],
  ["GET", "/api/users/:id"],
  ["POST", "/api/users"],
  ["PUT", "/api/users/:id"],
  ["GET", "/api/users/stats"],
  ["GET", "/api/roles"],
  ["GET", "/api/roles/:id"],
  ["GET", "/api/attendance"],
  ["GET", "/api/attendance/:id"],
  ["GET", "/api/attendance/report"],
  ["GET", "/api/attendance/corrections"],
  ["GET", "/api/attendance/corrections/:id"],
  ["PATCH", "/api/attendance/corrections/:id/review"],
  ["GET", "/api/salaries"],
  ["GET", "/api/salaries/:id"],
  ["GET", "/api/salaries/history/:userId"],
  ["GET", "/api/salaries/analytics"],
  ["POST", "/api/salaries"],
  ["GET", "/api/salaries/payslips"],
  ["POST", "/api/salaries/payslips"],
];

const EMPLOYEE_GRANTS = [
  ["GET", "/api/users/:id"],
  ["PUT", "/api/users/:id"],
  ["GET", "/api/attendance"],
  ["GET", "/api/attendance/:id"],
  ["POST", "/api/attendance"],
  ["GET", "/api/attendance/report"],
  ["GET", "/api/attendance/corrections"],
  ["GET", "/api/attendance/corrections/:id"],
  ["POST", "/api/attendance/corrections"],
  ["GET", "/api/salaries"],
  ["GET", "/api/salaries/:id"],
  ["GET", "/api/salaries/history/:userId"],
  ["GET", "/api/salaries/payslips"],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const [admins] = await queryInterface.sequelize.query(
      `SELECT id FROM "users" WHERE id = :id LIMIT 1`,
      { replacements: { id: ADMIN_USER_ID } }
    );
    const createdBy = admins[0]?.id;
    if (!createdBy) {
      console.log("Seed role permissions: bootstrap admin missing — skip (run initial seeder first).");
      return;
    }

    async function ensureGrants(roleId, grants) {
      for (const [method, path] of grants) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT id FROM "permissions" WHERE "roleId" = :roleId AND path = :path AND method = :method LIMIT 1`,
          { replacements: { roleId, path, method } }
        );
        if (existing.length > 0) continue;
        await queryInterface.bulkInsert("permissions", [
          {
            id: randomUUID(),
            roleId,
            createdBy,
            path,
            method,
            status: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
    }

    await ensureGrants(ROLE_IDS.HR, HR_GRANTS);
    await ensureGrants(ROLE_IDS.EMPLOYEE, EMPLOYEE_GRANTS);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("permissions", {
      roleId: [ROLE_IDS.HR, ROLE_IDS.EMPLOYEE],
    });
  },
};
