import type { FastifyInstance } from "fastify";
import type { User } from "../../models";
import { env } from "../../config/env";
import * as userRepository from "../../repositories/user.repository";
import * as roleRepository from "../../repositories/role.repository";
import * as refreshTokenRepository from "../../repositories/refresh-token.repository";
import * as passwordResetOtpRepository from "../../repositories/password-reset-otp.repository";
import { comparePassword } from "../../utils/password";
import { sendMail } from "../../utils/mailer";
import {
  generatePasswordResetOtp,
  generateRefreshToken,
  hashRefreshToken,
  issueAccessToken,
} from "../../utils/token";
import { ROLE_NAMES, type RoleName } from "../../constants/roles";
import { AppError, ConflictError } from "../../utils/app-error";
import { CACHE_NAMESPACE, invalidateNamespace } from "../../utils/cache";
import type { Logger } from "../../utils/logger";
import { scopedLogger } from "../../utils/scoped-logger";
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.validation";

/** Generic reply for forgot-password so callers can't enumerate registered emails. */
const FORGOT_PASSWORD_ACK =
  "If an account exists for that email, a one-time reset code has been sent. It expires in 10 minutes.";

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
    country: null,
    currency: "USD",
    department: null,
    jobTitle: null,
    employmentStatus: "ACTIVE",
    joinedAt: null,
    exitedAt: null,
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

/**
 * Creates a 10-minute OTP, emails it, and always returns the same ack
 * message whether or not the email is registered (anti-enumeration).
 */
export async function requestPasswordReset(
  logger: Logger,
  input: ForgotPasswordInput
): Promise<{ message: string }> {
  const log = scopedLogger(logger, LAYER, "requestPasswordReset");
  log.info({ email: input.email }, "Forgot password - processing");

  const user = await userRepository.findByEmail(log, input.email);
  if (!user) {
    log.info({ email: input.email }, "Forgot password - no user, returning generic ack");
    return { message: FORGOT_PASSWORD_ACK };
  }

  const { otp, otpHash } = generatePasswordResetOtp();
  await passwordResetOtpRepository.invalidateActiveForUser(log, user.id);
  await passwordResetOtpRepository.create(log, {
    userId: user.id,
    otpHash,
    expiresAt: passwordResetOtpRepository.otpExpiresAt(),
  });

  const subject = "ACME Pay — password reset code";
  const text = [
    `Hi ${user.firstName},`,
    "",
    `Your password reset code is: ${otp}`,
    "",
    "This code expires in 10 minutes. If you did not request a reset, you can ignore this email.",
  ].join("\n");
  const html = `<p>Hi ${user.firstName},</p><p>Your password reset code is: <strong style="font-size:1.25rem;letter-spacing:0.12em">${otp}</strong></p><p>This code expires in <strong>10 minutes</strong>. If you did not request a reset, you can ignore this email.</p>`;

  const sent = await sendMail(log, { to: user.email, subject, text, html });
  if (!sent) {
    if (env.nodeEnv === "development") {
      log.warn({ email: user.email, otp }, "Forgot password - SMTP skipped; OTP logged for local testing");
    } else {
      throw new AppError(
        "Unable to send reset email right now. Please try again later.",
        503,
        "EMAIL_SEND_FAILED"
      );
    }
  }

  log.info({ userId: user.id }, "Forgot password - completed");
  return { message: FORGOT_PASSWORD_ACK };
}

/**
 * Verifies a still-valid OTP, sets the new password, marks the OTP used,
 * and revokes every refresh token so existing sessions must re-login.
 */
export async function resetPasswordWithOtp(logger: Logger, input: ResetPasswordInput): Promise<{ message: string }> {
  const log = scopedLogger(logger, LAYER, "resetPasswordWithOtp");
  log.info({ email: input.email }, "Reset password - processing");

  const user = await userRepository.findByEmail(log, input.email);
  if (!user) {
    throw new AppError("Invalid or expired reset code.", 400, "INVALID_OTP");
  }

  const otpHash = hashRefreshToken(input.otp);
  const row = await passwordResetOtpRepository.findValidByUserAndHash(log, user.id, otpHash);
  if (!row) {
    log.warn({ userId: user.id }, "Reset password - invalid or expired OTP");
    throw new AppError("Invalid or expired reset code.", 400, "INVALID_OTP");
  }

  user.password = input.newPassword;
  await userRepository.save(log, user);
  await passwordResetOtpRepository.markUsed(log, row.id);
  await refreshTokenRepository.revokeAllForUser(log, user.id);
  await invalidateNamespace(log, CACHE_NAMESPACE.USERS);

  log.info({ userId: user.id }, "Reset password - completed");
  return { message: "Password updated. You can sign in with your new password." };
}

/**
 * Revokes the presented refresh token (and all other active refresh tokens
 * for that user) so Sign out cannot be undone with a leftover refresh cookie.
 */
export async function logout(logger: Logger, input: LogoutInput): Promise<{ message: string }> {
  const log = scopedLogger(logger, LAYER, "logout");
  log.info("Logout - processing");

  const tokenHash = hashRefreshToken(input.refreshToken);
  const stored = await refreshTokenRepository.findByTokenHash(log, tokenHash);

  if (stored && !stored.revokedAt) {
    await refreshTokenRepository.revokeAllForUser(log, stored.userId);
    log.info({ userId: stored.userId }, "Logout - completed");
  } else {
    log.info("Logout - token already invalid; treating as success");
  }

  return { message: "Signed out successfully." };
}
