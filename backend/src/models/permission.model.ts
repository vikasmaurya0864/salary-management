import {
  DataTypes,
  Model,
  type Association,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from "sequelize";
import { sequelize } from "../database/sequelize";
import type { HttpMethod, PermissionStatus } from "../constants/permission";
import type { Role } from "./role.model";
import type { User } from "./user.model";

/**
 * A role-scoped access grant to one API endpoint: "any user CURRENTLY
 * holding this role MAY call METHOD on PATH while status is ACTIVE".
 * `path` is the Fastify *route pattern* (e.g. `/api/users/:id`), not a
 * resolved URL with real ids — one row covers every resource at that
 * endpoint, not just one record.
 *
 * There is no per-user grant — permissions are looked up purely by the
 * requester's CURRENT role (see `permission.repository.ts`
 * `findActiveGrant` / `checkPermission` middleware). That's what makes a
 * role change (e.g. Employee promoted to HR) take effect immediately:
 * there's nothing tied to the old user to clean up or re-grant.
 *
 * `createdBy` is a required audit trail of who granted it — derived
 * server-side from the authenticated requester (only Admins can create
 * grants today), never taken from the request body.
 */
export class Permission extends Model<
  InferAttributes<Permission, { omit: "role" | "creator" }>,
  InferCreationAttributes<Permission, { omit: "role" | "creator" }>
> {
  declare id: CreationOptional<string>;
  declare roleId: ForeignKey<Role["id"]>;
  declare createdBy: ForeignKey<User["id"]>;

  declare path: string;
  declare method: HttpMethod;
  declare status: CreationOptional<PermissionStatus>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  declare role?: NonAttribute<Role>;
  declare creator?: NonAttribute<User>;

  declare static associations: {
    role: Association<Permission, Role>;
    creator: Association<Permission, User>;
  };
}

Permission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Permission",
    tableName: "permissions",
    timestamps: true,
    // No soft-delete: `status` is the toggle. Revoking sets INACTIVE (or the
    // row is hard-deleted); there's no "deleted but still counted" state to preserve.
    paranoid: false,
    // One grant per role/endpoint/method combination.
    indexes: [{ unique: true, fields: ["roleId", "path", "method"] }],
  }
);
