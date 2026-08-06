import { RefreshToken, Role, User } from "../models";
import type { Logger } from "../utils/logger";
import { scopedLogger } from "../utils/scoped-logger";

const LAYER = "RefreshTokenRepository";

const withUserAndRole = {
  include: [{ model: User, as: "user" as const, include: [{ model: Role, as: "role" as const }] }],
};

export interface CreateRefreshTokenRow {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export async function create(logger: Logger, data: CreateRefreshTokenRow): Promise<RefreshToken> {
  const log = scopedLogger(logger, LAYER, "create");
  log.info({ userId: data.userId }, "Create refresh token - inserting into database");
  const row = await RefreshToken.create({
    userId: data.userId,
    tokenHash: data.tokenHash,
    expiresAt: data.expiresAt,
    revokedAt: null,
  });
  log.info({ id: row.id, userId: data.userId }, "Create refresh token - insert completed");
  return row;
}

export async function findByTokenHash(logger: Logger, tokenHash: string): Promise<RefreshToken | null> {
  const log = scopedLogger(logger, LAYER, "findByTokenHash");
  log.info("Find refresh token by hash - querying database");
  const row = await RefreshToken.findOne({ where: { tokenHash }, ...withUserAndRole });
  log.info({ found: Boolean(row) }, "Find refresh token by hash - completed");
  return row;
}

export async function save(logger: Logger, row: RefreshToken): Promise<RefreshToken> {
  const log = scopedLogger(logger, LAYER, "save");
  log.info({ id: row.id }, "Save refresh token - persisting changes");
  await row.save();
  log.info({ id: row.id }, "Save refresh token - changes persisted");
  return row;
}

export async function revokeById(logger: Logger, id: string): Promise<void> {
  const log = scopedLogger(logger, LAYER, "revokeById");
  log.info({ id }, "Revoke refresh token - updating database");
  await RefreshToken.update({ revokedAt: new Date() }, { where: { id, revokedAt: null } });
  log.info({ id }, "Revoke refresh token - completed");
}
