"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("attendances", {
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
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      day: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "PRESENT",
      },
      checkInTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      checkOutTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      workingHours: {
        type: Sequelize.DECIMAL(5, 2),
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
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // One attendance row per employee per calendar date.
    await queryInterface.addIndex("attendances", ["userId", "date"], {
      unique: true,
      name: "attendances_user_id_date_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("attendances");
  },
};
