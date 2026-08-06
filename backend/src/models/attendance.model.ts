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
import type { AttendanceStatus, Workday } from "../constants/attendance";
import type { User } from "./user.model";

export class Attendance extends Model<InferAttributes<Attendance, { omit: "user" }>, InferCreationAttributes<Attendance, { omit: "user" }>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;

  /** Calendar date this record is for (`YYYY-MM-DD`), UTC. One row per user per date — attendance is mandatory every Mon-Fri. */
  declare date: string;
  declare day: Workday;
  declare status: CreationOptional<AttendanceStatus>;

  /** Only set when `status` is PRESENT; null for ABSENT/HOLIDAY. */
  declare checkInTime: Date | null;
  declare checkOutTime: Date | null;
  /** Hours, 2 decimal places. Auto-computed on checkout unless explicitly overridden. */
  declare workingHours: number | null;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date> | null;

  declare user?: NonAttribute<User>;

  declare static associations: {
    user: Association<Attendance, User>;
  };
}

Attendance.init(
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    day: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PRESENT",
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    checkOutTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    workingHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Attendance",
    tableName: "attendances",
    timestamps: true,
    paranoid: true,
    indexes: [{ unique: true, fields: ["userId", "date"] }],
  }
);
