import closeWithGrace from "close-with-grace";
import { buildApp } from "./app";
import { env } from "./config/env";
import { connectDatabase, sequelize } from "./database/sequelize";

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

    // Fail fast: refuse to accept traffic if the database isn't reachable,
    // rather than surfacing a confusing error on the first request.
    await connectDatabase(app.log);

    const address = await app.listen({ port: env.port, host: env.host });

    app.log.info(
      { address, port: env.port, host: env.host, nodeEnv: env.nodeEnv, pid: process.pid },
      `Server is up and running at ${address}`
    );

    // Ensures in-flight requests finish and resources (DB pools, etc.) are
    // released cleanly on SIGINT/SIGTERM or an unhandled rejection.
    closeWithGrace(
      { delay: 10000 },
      async ({ err, signal }: { err?: Error; signal?: string }) => {
        if (err) {
          app.log.error({ err }, "Server closing due to error");
        } else {
          app.log.info({ signal }, "Received shutdown signal. Closing server gracefully...");
        }

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
