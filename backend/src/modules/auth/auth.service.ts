import type { FastifyInstance } from "fastify";
import type { User } from "../../models";
import * as userRepository from "../../repositories/user.repository";
import * as roleRepository from "../../repositories/role.repository";
import * as refreshTokenRepository from "../../repositories/refresh-token.repository";
import { comparePassword } from "../../utils/password";
import { generateRefreshToken, hashRefreshToken, issueAccessToken } from "../../utils/token";
import { ROLE_NAMES, type RoleName } from "../../constants/roles";
import { AppError, ConflictError } from "../../utils/app-error";
import type { Logger } from "../../utils/logger";
import { scopedLogger } from "../../utils/scoped-logger";
import type { LoginInput, RefreshTokenInput, RegisterInput } from "./auth.validation";

const LAYER = "AuthService";

export interface AuthenticatedUser {
  user: User;
  roleName: RoleName;
}

/** Access + refresh pair returned by login / register / refresh. */
export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: User;
  roleName: RoleName;
}

/**
 * Verifies email/password credentials against the database.
 * Returns `null` on any failure (unknown email, wrong password, or a role
 * that's somehow missing) without distinguishing which — callers should
 * always respond with the same generic "invalid credentials" message to
 * avoid leaking which emails are registered.
 */
export async function authenticateUser(
  logger: Logger,
  { email, password }: LoginInput
): Promise<AuthenticatedUser | null> {
  const log = scopedLogger(logger, LAYER, "authenticateUser");
  log.info({ email }, "Login - processing");

  const user = await userRepository.findByEmail(log, email);
  if (!user) {
    log.warn({ email }, "Login - no user with this email");
    return null;
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    log.warn({ email }, "Login - incorrect password");
    return null;
  }

  if (!user.role) {
    log.error({ email }, "Login - user has no associated role, refusing to authenticate");
    return null;
  }

  log.info({ email, role: user.role.name }, "Login - completed");
  return { user, roleName: user.role.name as RoleName };
}

/**
 * Public self-registration. Always creates an EMPLOYEE — there is no way
 * to request another role here (see `registerSchema`). Admin/HR creating
 * accounts on someone else's behalf goes through `POST /api/users` instead.
 */
export async function registerUser(logger: Logger, input: RegisterInput): Promise<AuthenticatedUser> {
  const log = scopedLogger(logger, LAYER, "registerUser");
  log.info({ email: input.email }, "Register - processing");

  const existing = await userRepository.findByEmail(log, input.email);
  if (existing) {
    log.warn({ email: input.email }, "Register - email already in use");
    throw new ConflictError("A user with this email already exists");
  }

  const employeeRole = await roleRepository.findByName(log, ROLE_NAMES.EMPLOYEE);
  if (!employeeRole) {
    log.error("Register - EMPLOYEE role is not configured");
    throw new AppError("Role 'EMPLOYEE' is not configured. Run the database seeders.", 500, "ROLE_NOT_CONFIGURED");
  }

  const user = await userRepository.create(log, {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    password: input.password,
    mobile: input.mobile,
    address: input.address ?? null,
    roleId: employeeRole.id,
  });

  user.role = employeeRole;
  log.info({ id: user.id }, "Register - completed");
  return { user, roleName: ROLE_NAMES.EMPLOYEE };
}

/**
 * Issues a short-lived access JWT + a long-lived opaque refresh token,
 * persisting only the refresh token's SHA-256 hash in `refresh_tokens`.
 */
export async function createAuthSession(
  logger: Logger,
  app: FastifyInstance,
  user: User,
  roleName: RoleName
): Promise<AuthSession> {
  const log = scopedLogger(logger, LAYER, "createAuthSession");
  log.info({ userId: user.id }, "Create auth session - issuing tokens");

  const { accessToken, accessTokenExpiresAt } = issueAccessToken(app, { userId: user.id, role: roleName });
  const { refreshToken, refreshTokenExpiresAt, tokenHash } = generateRefreshToken();

  await refreshTokenRepository.create(log, {
    userId: user.id,
    tokenHash,
    expiresAt: refreshTokenExpiresAt,
  });

  log.info({ userId: user.id, accessTokenExpiresAt, refreshTokenExpiresAt }, "Create auth session - completed");
  return { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, user, roleName };
}

/**
 * Validates a refresh token against the DB. If still valid, revokes it
 * (rotation) and returns a fresh access + refresh pair. If missing,
 * expired, or already revoked — caller should force a full login again.
 */
export async function refreshAuthSession(
  logger: Logger,
  app: FastifyInstance,
  input: RefreshTokenInput
): Promise<AuthSession> {
  const log = scopedLogger(logger, LAYER, "refreshAuthSession");
  log.info("Refresh auth session - processing");

  const tokenHash = hashRefreshToken(input.refreshToken);
  const stored = await refreshTokenRepository.findByTokenHash(log, tokenHash);

  if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
    if (stored && !stored.revokedAt) {
      // Expired but not yet marked — revoke so it can't be retried.
      await refreshTokenRepository.revokeById(log, stored.id);
    }
    log.warn("Refresh auth session - rejected, invalid or expired refresh token");
    throw new AppError("Invalid or expired refresh token. Please log in again.", 401, "INVALID_REFRESH_TOKEN");
  }

  const user = stored.user;
  if (!user || !user.role) {
    log.error({ refreshTokenId: stored.id }, "Refresh auth session - linked user/role missing");
    await refreshTokenRepository.revokeById(log, stored.id);
    throw new AppError("Invalid or expired refresh token. Please log in again.", 401, "INVALID_REFRESH_TOKEN");
  }

  // Rotate: old refresh token is one-time use.
  await refreshTokenRepository.revokeById(log, stored.id);

  const roleName = user.role.name as RoleName;
  const session = await createAuthSession(log, app, user, roleName);
  log.info({ userId: user.id }, "Refresh auth session - completed");
  return session;
}
