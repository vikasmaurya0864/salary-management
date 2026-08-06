import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";
import type { Logger } from "./logger";
import { scopedLogger } from "./scoped-logger";

const LAYER = "Mailer";

let transporter: Transporter | null | undefined;

/** Lazily built, memoized transport. `undefined` = not yet attempted, `null` = SMTP isn't configured. */
function getTransporter(logger: Logger): Transporter | null {
  if (transporter !== undefined) {
    return transporter;
  }

  if (!env.smtp.host || !env.smtp.user || !env.smtp.password) {
    scopedLogger(logger, LAYER, "getTransporter").warn(
      "SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — emails will be skipped"
    );
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.password },
  });
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Best-effort email send — NEVER throws. Callers (e.g. the nightly
 * auto-absence cron job) need to keep processing every other user even if
 * SMTP is unreachable or unconfigured; email is a nice-to-have on top of
 * the DB write, not a precondition for it.
 */
export async function sendMail(logger: Logger, input: SendMailInput): Promise<boolean> {
  const log = scopedLogger(logger, LAYER, "sendMail");

  const client = getTransporter(logger);
  if (!client) {
    log.warn({ to: input.to, subject: input.subject }, "Send mail - skipped, SMTP not configured");
    return false;
  }

  try {
    await client.sendMail({
      from: env.smtp.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    log.info({ to: input.to, subject: input.subject }, "Send mail - sent successfully");
    return true;
  } catch (error) {
    log.error({ err: error, to: input.to, subject: input.subject }, "Send mail - failed to send");
    return false;
  }
}
