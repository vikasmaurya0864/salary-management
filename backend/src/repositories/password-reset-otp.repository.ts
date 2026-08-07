import { Op } from "sequelize";
import { PasswordResetOtp, User } from "../models";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "PasswordResetOtpRepository";

const OTP_TTL_MS = 10 * 60 * 1000;

export function otpExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MS);
}

export async function invalidateActiveForUser(logger: Logger, userId: string): Promise<void> {
  const log = scopedLogger(logger, LAYER, "invalidateActiveForUser");
  log.info({ userId }, "Invalidate active OTPs - updating database");
  await PasswordResetOtp.update(
    { usedAt: new Date() },
    { where: { userId, usedAt: null, expiresAt: { [Op.gt]: new Date() } } }
  );
  log.info({ userId }, "Invalidate active OTPs - completed");
}

export async function create(
  logger: Logger,
  data: { userId: string; otpHash: string; expiresAt: Date }
): Promise<PasswordResetOtp> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info({ userId: data.userId }, "Create password-reset OTP - inserting into database");
  const row = await PasswordResetOtp.create({
    userId: data.userId,
    otpHash: data.otpHash,
    expiresAt: data.expiresAt,
    usedAt: null,
  });
  log.info({ id: row.id, userId: data.userId }, "Create password-reset OTP - insert completed");
  return row;
}

export async function findValidByUserAndHash(
  logger: Logger,
  userId: string,
  otpHash: string
): Promise<PasswordResetOtp | null> {
  const log = scopedLogger(logger, LAYER, "findValidByUserAndHash");
  log.info({ userId }, "Find valid OTP - querying database");
  const row = await PasswordResetOtp.findOne({
    where: {
      userId,
      otpHash,
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    include: [{ model: User, as: "user" }],
  });
  log.info({ found: Boolean(row) }, "Find valid OTP - completed");
  return row;
}

export async function markUsed(logger: Logger, id: string): Promise<void> {
  const log = scopedLogger(logger, LAYER, "markUsed");
  log.info({ id }, "Mark OTP used - updating database");
  await PasswordResetOtp.update({ usedAt: new Date() }, { where: { id, usedAt: null } });
  log.info({ id }, "Mark OTP used - completed");
}
