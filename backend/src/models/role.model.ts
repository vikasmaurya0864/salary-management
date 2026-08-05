import {
  DataTypes,
  Model,
  type Association,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from "sequelize";
import { sequelize } from "../database/sequelize";
import type { User } from "./user.model";

export class Role extends Model<InferAttributes<Role, { omit: "users" }>, InferCreationAttributes<Role, { omit: "users" }>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare description: string | null;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date> | null;

  // Populated only when eagerly loaded via `include`, never a plain column.
  declare users?: NonAttribute<User[]>;

  declare static associations: {
    users: Association<Role, User>;
  };
}

Role.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Role",
    tableName: "roles",
    timestamps: true,
    // Soft delete: a deleted role is hidden from normal queries (deletedAt
    // set) instead of the row being removed, so historical user records
    // that reference it never dangle.
    paranoid: true,
  }
);
