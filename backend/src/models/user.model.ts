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
import { hashPassword } from "../utils/password";
import { Role } from "./role.model";

export class User extends Model<InferAttributes<User, { omit: "role" }>, InferCreationAttributes<User, { omit: "role" }>> {
  declare id: CreationOptional<string>;
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare password: string;
  declare mobile: string;
  declare address: string | null;
  declare roleId: ForeignKey<Role["id"]>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date> | null;

  // Populated only when eagerly loaded via `include: [{ model: Role, as: "role" }]`.
  declare role?: NonAttribute<Role>;

  declare static associations: {
    role: Association<User, Role>;
  };

  /**
   * Ensures the hashed password never leaks out through `res.send(user)`,
   * `JSON.stringify(user)`, etc. This is the last line of defense — routes
   * should still prefer building explicit response DTOs.
   */
  override toJSON(): Omit<ReturnType<Model["get"]>, "password"> {
    const values = { ...this.get() } as Record<string, unknown>;
    delete values.password;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      // Normalizes casing so "User@Example.com" and "user@example.com"
      // are treated as the same account.
      set(value: string) {
        this.setDataValue("email", value.trim().toLowerCase());
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { notEmpty: true },
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    paranoid: true,
    hooks: {
      beforeCreate: async (user) => {
        user.password = await hashPassword(user.password);
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await hashPassword(user.password);
        }
      },
    },
  }
);
