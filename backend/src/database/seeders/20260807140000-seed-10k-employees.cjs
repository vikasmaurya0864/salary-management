"use strict";

/**
 * Seeds ~10,000 EMPLOYEE users across multiple countries/currencies, each
 * with one current salary package — so HR analytics has real volume to
 * answer "how the org pays people" without Excel.
 *
 * Idempotent: if active EMPLOYEE count is already >= TARGET, skips.
 * Shared bcrypt hash (Employee@1234) so seeding stays minutes, not hours.
 */
const { randomUUID } = require("crypto");
const bcrypt = require("bcrypt");

const EMPLOYEE_ROLE_ID = "7bd849d0-edc9-481d-9834-2d2c475aaa01";
const ADMIN_USER_ID = "6d25db8b-6aec-47a5-b6ce-a04d0aa977b6";
const TARGET = 10_000;
const BATCH = 500;
const DEFAULT_PASSWORD = "Employee@1234";

const LOCATIONS = [
  { country: "IN", currency: "INR", base: 720_000, dept: ["Engineering", "Sales", "Operations", "Finance"] },
  { country: "US", currency: "USD", base: 95_000, dept: ["Engineering", "Sales", "Product", "Support"] },
  { country: "GB", currency: "GBP", base: 62_000, dept: ["Engineering", "Finance", "HR Ops"] },
  { country: "DE", currency: "EUR", base: 68_000, dept: ["Engineering", "Operations", "Sales"] },
  { country: "AE", currency: "AED", base: 220_000, dept: ["Sales", "Support", "Finance"] },
  { country: "SG", currency: "SGD", base: 88_000, dept: ["Engineering", "Product", "Finance"] },
  { country: "AU", currency: "AUD", base: 105_000, dept: ["Sales", "Support", "Operations"] },
  { country: "CA", currency: "CAD", base: 92_000, dept: ["Engineering", "Support", "Finance"] },
];

const TITLES = ["Analyst", "Associate", "Senior", "Lead", "Manager", "Specialist"];

function pick(arr, i) {
  return arr[i % arr.length];
}

function moneyVariance(base, i) {
  // Deterministic ±15% so re-seeds are stable and tests can reason about totals.
  const factor = 0.85 + ((i * 17) % 31) / 100;
  return Math.round(base * factor * 100) / 100;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [[{ count }]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM "users" u
       WHERE u."roleId" = :roleId AND u."deletedAt" IS NULL`,
      { replacements: { roleId: EMPLOYEE_ROLE_ID } }
    );

    if (count >= TARGET) {
      console.log(`Seed 10k employees: already have ${count} employees — skipping.`);
      return;
    }

    const [admins] = await queryInterface.sequelize.query(
      `SELECT id FROM "users" WHERE id = :id LIMIT 1`,
      { replacements: { id: ADMIN_USER_ID } }
    );
    const createdBy = admins[0]?.id;
    if (!createdBy) {
      throw new Error("Bootstrap admin missing — run the initial seeder first.");
    }

    const need = TARGET - count;
    console.log(`Seed 10k employees: inserting ${need} employees (+ salary packages)...`);

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const now = new Date();
    const startIndex = count + 1;

    for (let offset = 0; offset < need; offset += BATCH) {
      const size = Math.min(BATCH, need - offset);
      const users = [];
      const salaries = [];

      for (let j = 0; j < size; j++) {
        const n = startIndex + offset + j;
        const loc = pick(LOCATIONS, n);
        const userId = randomUUID();
        const department = pick(loc.dept, n);
        const jobTitle = `${pick(TITLES, n)} ${department}`;
        const baseSalary = moneyVariance(loc.base, n);
        const allowances = Math.round(baseSalary * 0.12 * 100) / 100;
        const deductions = Math.round(baseSalary * 0.08 * 100) / 100;
        const joinedAt = `2018-${String((n % 12) + 1).padStart(2, "0")}-${String((n % 28) + 1).padStart(2, "0")}`;

        users.push({
          id: userId,
          firstName: `Emp${n}`,
          lastName: pick(["Patel", "Smith", "Garcia", "Chen", "Khan", "Mueller", "Tan", "Brown"], n),
          email: `employee${n}@acme.example`,
          password: passwordHash,
          mobile: `9${String(1000000000 + n).slice(0, 9)}`,
          address: null,
          country: loc.country,
          currency: loc.currency,
          department,
          jobTitle,
          employmentStatus: "ACTIVE",
          joinedAt,
          exitedAt: null,
          roleId: EMPLOYEE_ROLE_ID,
          createdAt: now,
          updatedAt: now,
        });

        salaries.push({
          id: randomUUID(),
          userId,
          currency: loc.currency,
          baseSalary,
          allowances,
          deductions,
          effectiveFrom: joinedAt,
          effectiveTo: null,
          note: "Seeded ACME package",
          createdBy,
          createdAt: now,
          updatedAt: now,
        });
      }

      await queryInterface.bulkInsert("users", users);
      await queryInterface.bulkInsert("salaries", salaries);
      console.log(`  … ${Math.min(offset + size, need)} / ${need}`);
    }

    console.log(`Seed 10k employees: done. Login sample: employee${startIndex}@acme.example / ${DEFAULT_PASSWORD}`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM "salaries" WHERE "userId" IN (SELECT id FROM "users" WHERE email LIKE 'employee%@acme.example')`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM "users" WHERE email LIKE 'employee%@acme.example'`
    );
  },
};
