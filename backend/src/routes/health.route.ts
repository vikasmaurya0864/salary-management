import type { FastifyInstance } from "fastify";
import { env } from "../config/env";

interface HealthResponseBody {
  success: true;
  status: "ok";
  uptime: number;
  timestamp: string;
  environment: string;
}

/**
 * Simple liveness/readiness probe used by load balancers, uptime monitors,
 * and local sanity checks (`GET /health`).
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (): Promise<HealthResponseBody> => {
    return {
      success: true,
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    };
  });
}
