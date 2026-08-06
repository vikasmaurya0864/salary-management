"use strict";

/**
 * A permission grant can now target an entire ROLE instead of one specific
 * user: store `roleId` alongside the existing `userId`. This is what makes
 * "promote an Employee to HR" instantly pick up every permission already
 * granted to HR — the access check (see `permission.repository.ts`
 * `findActiveGrant`) matches on the requester's CURRENT role, not a
 * snapshot taken at grant time, so there's nothing to re-grant when a
 * user's role changes.
 *
 * `userId` becomes nullable and exactly one of userId/roleId must be set —
 * enforced with a CHECK constraint, not just app-level validation.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("permissions", "roleId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "roles", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.changeColumn("permissions", "userId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    // One grant per role/endpoint/method combination (mirrors the existing
    // userId/path/method unique index above it).
    await queryInterface.addIndex("permissions", ["roleId", "path", "method"], {
      unique: true,
      name: "permissions_role_id_path_method_unique",
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "permissions"
      ADD CONSTRAINT "permissions_user_or_role_check"
      CHECK (
        ("userId" IS NOT NULL AND "roleId" IS NULL)
        OR ("userId" IS NULL AND "roleId" IS NOT NULL)
      )
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_user_or_role_check"
    `);
    await queryInterface.removeIndex("permissions", "permissions_role_id_path_method_unique");
    await queryInterface.changeColumn("permissions", "userId", {
      type: Sequelize.UUID,
      allowNull: false,
    });
    await queryInterface.removeColumn("permissions", "roleId");
  },
};
