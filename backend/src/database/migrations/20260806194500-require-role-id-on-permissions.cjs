"use strict";

/**
 * Every permission grant now always records BOTH the specific user it was
 * created for AND the role that user held at grant time — `userId` and
 * `roleId` are both required (no more nullable/exclusive-or). Access
 * checks (see `permission.repository.ts` `findActiveGrant`) still match on
 * EITHER the requester's own userId OR their CURRENT role id, so a role
 * change (e.g. Employee -> HR) instantly grants access to any permission
 * already recorded for HR — nothing needs to be re-granted.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Must drop the old "exactly one of userId/roleId" CHECK constraint
    // before backfilling, otherwise setting roleId on a row that already
    // has userId set would itself violate that very constraint.
    await queryInterface.sequelize.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_user_or_role_check"
    `);

    // Backfill any existing rows created before roleId existed.
    await queryInterface.sequelize.query(`
      UPDATE "permissions" p
      SET "roleId" = u."roleId"
      FROM "users" u
      WHERE p."userId" = u.id AND p."roleId" IS NULL
    `);
    // Was unique (one role-scoped row per role); now many per-user rows
    // legitimately share the same roleId/path/method, so it becomes a
    // plain lookup index instead.
    await queryInterface.removeIndex("permissions", "permissions_role_id_path_method_unique");
    await queryInterface.addIndex("permissions", ["roleId", "path", "method"], {
      name: "permissions_role_id_path_method_idx",
    });

    await queryInterface.changeColumn("permissions", "roleId", {
      type: Sequelize.UUID,
      allowNull: false,
    });
    await queryInterface.changeColumn("permissions", "userId", {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("permissions", "userId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.changeColumn("permissions", "roleId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.removeIndex("permissions", "permissions_role_id_path_method_idx");
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
};
