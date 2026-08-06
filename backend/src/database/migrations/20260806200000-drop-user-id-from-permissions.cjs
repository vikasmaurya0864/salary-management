"use strict";

/**
 * Permissions are now purely role-scoped: a grant is "role X may METHOD
 * PATH", full stop. There is no per-user permission row anymore — `userId`
 * is dropped entirely. Access checks resolve the requester's CURRENT role
 * (from their JWT) and look up a grant for that role, so a role change
 * takes effect immediately with nothing to re-grant per user.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex("permissions", "permissions_user_id_path_method_unique");
    await queryInterface.removeIndex("permissions", "permissions_role_id_path_method_idx");
    await queryInterface.removeColumn("permissions", "userId");

    // Exactly one grant per role/endpoint/method combination now that a
    // role's grant is a single row, not one per user in that role.
    await queryInterface.addIndex("permissions", ["roleId", "path", "method"], {
      unique: true,
      name: "permissions_role_id_path_method_unique",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("permissions", "permissions_role_id_path_method_unique");
    await queryInterface.addColumn("permissions", "userId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
    await queryInterface.addIndex("permissions", ["roleId", "path", "method"], {
      name: "permissions_role_id_path_method_idx",
    });
    await queryInterface.addIndex("permissions", ["userId", "path", "method"], {
      unique: true,
      name: "permissions_user_id_path_method_unique",
    });
  },
};
