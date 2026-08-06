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
import type { AttendanceStatus, Workday, CorrectionStatus } from "../constants/attendance";
import type { User } from "./user.model";
import type { Attendance } from "./attendance.model";

type Omitted = "requester" | "reviewer" | "attendance";

export class AttendanceCorrectionRequest extends Model<
  InferAttributes<AttendanceCorrectionRequest, { omit: Omitted }>,
  InferCreationAttributes<AttendanceCorrectionRequest, { omit: Omitted }>
> {
  declare id: CreationOptional<string>;

  /** The employee this correction is for (and who raised it). */
  declare userId: ForeignKey<User["id"]>;

  /** The existing attendance row being corrected, if one exists yet for that date. */
  declare attendanceId: ForeignKey<Attendance["id"]> | null;

  declare requestedDate: string;
  declare requestedDay: Workday;
  /** What the employee is claiming this date should be: a time correction (PRESENT), an absence, or a holiday. */
  declare requestedStatus: AttendanceStatus;
  /** Required (and meaningful) only when `requestedStatus` is PRESENT. */
  declare requestedCheckInTime: Date | null;
  declare requestedCheckOutTime: Date | null;
  declare requestedWorkingHours: number | null;
  declare reason: string | null;

  declare status: CreationOptional<CorrectionStatus>;
  declare reviewedBy: ForeignKey<User["id"]> | null;
  declare reviewedAt: Date | null;
  declare reviewNote: string | null;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  declare requester?: NonAttribute<User>;
  declare reviewer?: NonAttribute<User>;
  declare attendance?: NonAttribute<Attendance>;

  declare static associations: {
    requester: Association<AttendanceCorrectionRequest, User>;
    reviewer: Association<AttendanceCorrectionRequest, User>;
    attendance: Association<AttendanceCorrectionRequest, Attendance>;
  };
}

AttendanceCorrectionRequest.init(
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
    attendanceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    requestedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    requestedDay: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    requestedStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PRESENT",
    },
    requestedCheckInTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    requestedCheckOutTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    requestedWorkingHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDING",
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewNote: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "AttendanceCorrectionRequest",
    tableName: "attendance_correction_requests",
    timestamps: true,
    // No soft-delete: these are an approval audit trail, never deleted.
    paranoid: false,
  }
);
