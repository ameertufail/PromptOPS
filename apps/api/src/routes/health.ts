import { API_HEALTH_PATH, apiHealthResponseSchema } from "@promptops/shared";
import { Hono } from "hono";
import type { AppEnv } from "../types";

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get(API_HEALTH_PATH, (c) => {
  const payload = apiHealthResponseSchema.parse({
    environment: c.env?.ENVIRONMENT ?? "development",
    service: "promptops-api",
    status: "ok",
    timestamp: new Date().toISOString()
  });

  return c.json(payload);
});
