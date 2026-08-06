import closeWithGrace from "close-with-grace";
import { buildApp } from "./app";
import { env } from "./config/env";
import { connectDatabase, sequelize } from "./database/sequelize";
import { startCronJobs, stopCronJobs } from "./jobs";

/**
 * Boots the Fastify application: connects to the database, builds the app,
 * starts listening, wires up graceful shutdown, and logs the outcome.
 * Returns the running app instance so callers (e.g. tests) can close it
 * manually if needed.
 */
export async function bootstrap() {
  const app = buildApp();

  try {
    app.log.info({ nodeEnv: env.nodeEnv }, "Starting server...");

    // Blocks here until the database is reachable — refuses to accept
    // traffic in the meantime. Retries indefinitely every 5s on failure
    // (see DEFAULT_MAX_ATTEMPTS/DEFAULT_RETRY_DELAY_MS in
    // `database/sequelize.ts`), so a slow-starting/restarting Postgres
    // recovers on its own instead of the app crashing.
    await connectDatabase(app.log);

    const address = await app.listen({ port: env.port, host: env.host });

    app.log.info(
      { address, port: env.port, host: env.host, nodeEnv: env.nodeEnv, pid: process.pid },
      `Server is up and running at ${address}`
    );

    // Attendance reminder (8am) / auto-absence (7pm) weekday jobs — see src/jobs/.
    const cronTasks = startCronJobs(app.log);

    // Ensures in-flight requests finish and resources (DB pools, scheduled
    // jobs, etc.) are released cleanly on SIGINT/SIGTERM or an unhandled rejection.
    closeWithGrace(
      { delay: 10000 },
      async ({ err, signal }: { err?: Error; signal?: string }) => {
        if (err) {
          app.log.error({ err }, "Server closing due to error");
        } else {
          app.log.info({ signal }, "Received shutdown signal. Closing server gracefully...");
        }

        await stopCronJobs(app.log, cronTasks);
        await app.close();
        await sequelize.close();
        app.log.info("Server closed. Goodbye!");
      }
    );

    return app;
  } catch (error) {
    app.log.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}
