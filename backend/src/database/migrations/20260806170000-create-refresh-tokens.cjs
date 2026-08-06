"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("refresh_tokens", {
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
      // SHA-256 hex of the opaque refresh token. The plaintext is only ever
      // returned once (at login/register/refresh) and never stored.
      tokenHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revokedAt: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex("refresh_tokens", ["userId"], {
      name: "refresh_tokens_user_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("refresh_tokens");
  },
};
