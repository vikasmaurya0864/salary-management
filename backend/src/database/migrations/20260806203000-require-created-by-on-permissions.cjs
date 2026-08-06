"use strict";

/**
 * `createdBy` is now required on every permission grant (matches the
 * model). Since it's no longer nullable, "ON DELETE SET NULL" on its FK no
 * longer makes sense — switched to RESTRICT, so hard-deleting a user who
 * created grants is blocked outright instead of ever attempting (and
 * failing) to null out a NOT NULL column.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_createdBy_fkey"
    `);
    await queryInterface.changeColumn("permissions", "createdBy", {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_createdBy_fkey"
    `);
    await queryInterface.changeColumn("permissions", "createdBy", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },
};
