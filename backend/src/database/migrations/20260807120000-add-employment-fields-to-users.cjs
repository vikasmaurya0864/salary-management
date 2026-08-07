"use strict";

/** Employment / multi-country master-data fields needed for salary reporting. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "country", {
      type: Sequelize.STRING(2),
      allowNull: true,
    });
    await queryInterface.addColumn("users", "currency", {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: "USD",
    });
    await queryInterface.addColumn("users", "department", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("users", "jobTitle", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("users", "employmentStatus", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "ACTIVE",
    });
    await queryInterface.addColumn("users", "joinedAt", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "exitedAt", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addIndex("users", ["country"], { name: "users_country_idx" });
    await queryInterface.addIndex("users", ["currency"], { name: "users_currency_idx" });
    await queryInterface.addIndex("users", ["department"], { name: "users_department_idx" });
    await queryInterface.addIndex("users", ["employmentStatus"], { name: "users_employment_status_idx" });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("users", "users_employment_status_idx");
    await queryInterface.removeIndex("users", "users_department_idx");
    await queryInterface.removeIndex("users", "users_currency_idx");
    await queryInterface.removeIndex("users", "users_country_idx");
    await queryInterface.removeColumn("users", "exitedAt");
    await queryInterface.removeColumn("users", "joinedAt");
    await queryInterface.removeColumn("users", "employmentStatus");
    await queryInterface.removeColumn("users", "jobTitle");
    await queryInterface.removeColumn("users", "department");
    await queryInterface.removeColumn("users", "currency");
    await queryInterface.removeColumn("users", "country");
  },
};
