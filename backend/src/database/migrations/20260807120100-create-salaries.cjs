"use strict";

/**
 * Compensation history per employee. A row with effectiveTo = NULL is the
 * current package. Revisions close the previous open row and insert a new one
 * so HR can answer "what did we pay this person over time?".
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("salaries", {
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
        defaultValue: 0,
      },
      deductions: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      effectiveFrom: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      effectiveTo: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      note: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      createdBy: {
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

    await queryInterface.addIndex("salaries", ["userId"], { name: "salaries_user_id_idx" });
    await queryInterface.addIndex("salaries", ["userId", "effectiveFrom"], {
      name: "salaries_user_id_effective_from_idx",
    });
    await queryInterface.addIndex("salaries", ["currency"], { name: "salaries_currency_idx" });
    // At most one "current" package per user (effectiveTo IS NULL).
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX salaries_user_id_current_unique
      ON "salaries" ("userId")
      WHERE "effectiveTo" IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS salaries_user_id_current_unique`);
    await queryInterface.dropTable("salaries");
  },
};
