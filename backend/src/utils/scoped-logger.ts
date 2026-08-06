import type { Logger } from "./logger";

/**
 * Binds `{ layer, fn }` to every subsequent log line via pino's `.child()`,
 * so tracing a request through the stack (controller -> service ->
 * repository) is just grepping the logs for a `layer`/`fn` pair.
 *
 * The same underlying request logger (`request.log`) must be threaded
 * through every layer (controller -> service -> repository) so all of it
 * still shares one `reqId`, correlating the whole call chain back to a
 * single HTTP request.
 *
 * Usage:
 *   const log = scopedLogger(request.log, "UserController", "updateUserHandler");
 *   log.info("Update user - request received");
 */
export function scopedLogger(logger: Logger, layer: string, fn: string): Logger {
  return logger.child({ layer, fn }) as Logger;
}
