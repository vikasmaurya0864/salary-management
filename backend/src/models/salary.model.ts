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
import type { CurrencyCode } from "../constants/employment";
import type { User } from "./user.model";

export class Salary extends Model<
  InferAttributes<Salary, { omit: "user" | "creator" }>,
  InferCreationAttributes<Salary, { omit: "user" | "creator" }>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare currency: CurrencyCode;
  declare baseSalary: string;
  declare allowances: CreationOptional<string>;
  declare deductions: CreationOptional<string>;
  declare effectiveFrom: string;
  declare effectiveTo: string | null;
  declare note: string | null;
  declare createdBy: ForeignKey<User["id"]>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;
  declare creator?: NonAttribute<User>;

  declare static associations: {
    user: Association<Salary, User>;
    creator: Association<Salary, User>;
  };
}

Salary.init(
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
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    baseSalary: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    allowances: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    deductions: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Salary",
    tableName: "salaries",
    timestamps: true,
    paranoid: false,
  }
);
