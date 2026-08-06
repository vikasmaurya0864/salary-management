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
import type { User } from "./user.model";

/**
 * A single per-user access grant to one API endpoint: "this user MAY call
 * METHOD on PATH while status is ACTIVE". `path` is the Fastify *route
 * pattern* (e.g. `/api/users/:id`), not a resolved URL with real ids — one
 * row covers every resource at that endpoint, not just one record.
 */
export class Permission extends Model<InferAttributes<Permission, { omit: "user" }>, InferCreationAttributes<Permission, { omit: "user" }>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;

  declare path: string;
  declare method: HttpMethod;
  declare status: CreationOptional<PermissionStatus>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;

  declare static associations: {
    user: Association<Permission, User>;
  };
}

Permission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
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
    indexes: [{ unique: true, fields: ["userId", "path", "method"] }],
  }
);
