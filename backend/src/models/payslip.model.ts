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
import type { Salary } from "./salary.model";
import type { User } from "./user.model";

export class Payslip extends Model<
  InferAttributes<Payslip, { omit: "user" | "salary" | "generator" }>,
  InferCreationAttributes<Payslip, { omit: "user" | "salary" | "generator" }>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare salaryId: ForeignKey<Salary["id"]> | null;
  declare year: number;
  declare month: number;
  declare currency: CurrencyCode;
  declare baseSalary: string;
  declare allowances: string;
  declare deductions: string;
  declare gross: string;
  declare net: string;
  declare generatedBy: ForeignKey<User["id"]>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;
  declare salary?: NonAttribute<Salary>;
  declare generator?: NonAttribute<User>;

  declare static associations: {
    user: Association<Payslip, User>;
    salary: Association<Payslip, Salary>;
    generator: Association<Payslip, User>;
  };
}

Payslip.init(
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
    salaryId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    month: {
      type: DataTypes.INTEGER,
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
    },
    deductions: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    gross: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    net: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    generatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Payslip",
    tableName: "payslips",
    timestamps: true,
    paranoid: false,
    indexes: [{ unique: true, fields: ["userId", "year", "month"] }],
  }
);
