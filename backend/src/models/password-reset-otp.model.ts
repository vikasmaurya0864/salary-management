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
import type { User } from "./user.model";

/**
 * One-time password-reset code. Client receives the 6-digit OTP by email;
 * we only persist `otpHash` (SHA-256). Valid for 10 minutes from creation.
 */
export class PasswordResetOtp extends Model<
  InferAttributes<PasswordResetOtp, { omit: "user" }>,
  InferCreationAttributes<PasswordResetOtp, { omit: "user" }>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare otpHash: string;
  declare expiresAt: Date;
  declare usedAt: Date | null;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;

  declare static associations: {
    user: Association<PasswordResetOtp, User>;
  };
}

PasswordResetOtp.init(
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
    otpHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "PasswordResetOtp",
    tableName: "password_reset_otps",
    timestamps: true,
    paranoid: false,
    indexes: [{ fields: ["userId"] }, { fields: ["otpHash"] }],
  }
);
