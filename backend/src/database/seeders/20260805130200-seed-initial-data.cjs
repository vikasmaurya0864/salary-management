"use strict";

require("dotenv/config");
const bcrypt = require("bcrypt");

// Fixed IDs so re-running/inspecting the seed is predictable. Only used
// internally to link the bootstrap admin user to the ADMIN role below.
const ROLE_IDS = {
  ADMIN: "4ed6e802-9d78-4745-8229-cfa74da6d83b",
  HR: "417ad2b4-9377-457c-bee6-f53df28f1b29",
  EMPLOYEE: "7bd849d0-edc9-481d-9834-2d2c475aaa01",
};
const ADMIN_USER_ID = "6d25db8b-6aec-47a5-b6ce-a04d0aa977b6";

const BCRYPT_SALT_ROUNDS = 12;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert("roles", [
      {
        id: ROLE_IDS.ADMIN,
        name: "ADMIN",
        description: "Full system access. Creates and manages HR accounts.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ROLE_IDS.HR,
        name: "HR",
        description: "Creates and manages Employee accounts and records.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ROLE_IDS.EMPLOYEE,
        name: "EMPLOYEE",
        description: "Standard employee account.",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    if (!process.env.ADMIN_PASSWORD) {
      throw new Error("ADMIN_PASSWORD must be set in .env before seeding the bootstrap admin user.");
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

    await queryInterface.bulkInsert("users", [
      {
        id: ADMIN_USER_ID,
        firstName: "System",
        lastName: "Admin",
        email: process.env.ADMIN_EMAIL || "admin@salary-management.local",
        password: hashedPassword,
        mobile: "0000000000",
        address: null,
        roleId: ROLE_IDS.ADMIN,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", { id: ADMIN_USER_ID });
    await queryInterface.bulkDelete("roles", {
      id: [ROLE_IDS.ADMIN, ROLE_IDS.HR, ROLE_IDS.EMPLOYEE],
    });
  },
};
