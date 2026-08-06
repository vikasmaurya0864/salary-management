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
 * Persistent refresh-token row. The client stores the opaque plaintext;
 * we only ever persist `tokenHash` (SHA-256). Used by POST /api/auth/refresh
 * when the short-lived access JWT has expired.
 */
export class RefreshToken extends Model<
  InferAttributes<RefreshToken, { omit: "user" }>,
  InferCreationAttributes<RefreshToken, { omit: "user" }>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare revokedAt: Date | null;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;

  declare static associations: {
    user: Association<RefreshToken, User>;
  };
}

RefreshToken.init(
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
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "RefreshToken",
    tableName: "refresh_tokens",
    timestamps: true,
    paranoid: false,
    indexes: [{ fields: ["userId"] }],
  }
);
