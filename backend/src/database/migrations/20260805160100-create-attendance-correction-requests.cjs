"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("attendance_correction_requests", {
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
      attendanceId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "attendances", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      requestedDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      requestedDay: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      requestedStatus: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "PRESENT",
      },
      requestedCheckInTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      requestedCheckOutTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      requestedWorkingHours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      reason: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "PENDING",
      },
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reviewNote: {
        type: Sequelize.STRING(500),
        allowNull: true,
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

    await queryInterface.addIndex("attendance_correction_requests", ["userId"]);
    await queryInterface.addIndex("attendance_correction_requests", ["status"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("attendance_correction_requests");
  },
};
