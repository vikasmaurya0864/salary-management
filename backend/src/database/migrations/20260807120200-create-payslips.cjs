"use strict";

/**
 * Monthly payslip snapshots. Generated from the employee's salary package
 * that was active for that month — stored as a freeze so later salary
 * revisions don't rewrite history.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payslips", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      salaryId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "salaries", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
      },
      baseSalary: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      allowances: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      deductions: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      gross: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      net: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      generatedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("payslips", ["userId", "year", "month"], {
      unique: true,
      name: "payslips_user_id_year_month_unique",
    });
    await queryInterface.addIndex("payslips", ["year", "month"], { name: "payslips_year_month_idx" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("payslips");
  },
};
