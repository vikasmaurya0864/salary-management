"use strict";

/**
 * Records WHO created each permission grant. Today only Admins can call
 * `POST /api/permissions` (see `permission.routes.ts` `requireRole(ADMIN)`),
 * so in practice this is always the acting admin's user id — but it's
 * derived server-side from the authenticated requester, never accepted
 * from the request body, so it stays trustworthy even if that ever changes.
 *
 * Nullable at the DB level (mirrors `reviewedBy` on correction requests) so
 * hard-deleting a user never blocks or corrupts the grants they created —
 * the grant just survives with an unknown creator, which is preferable to
 * losing the whole access grant.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("permissions", "createdBy", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("permissions", "createdBy");
  },
};
