import { API_HEALTH_PATH } from "@promptops/shared";
import { Hono } from "hono";

export type AppBindings = {
  DB?: D1Database;
  ENVIRONMENT?: string;
  FRONTEND_URL?: string;
  STORAGE?: R2Bucket;
};

const app = new Hono<{ Bindings: AppBindings }>();

const LOCAL_FRONTEND_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

function getAllowedOrigin(
  requestOrigin: string | undefined,
  configuredOrigin?: string
) {
  if (!requestOrigin) {
    return undefined;
  }

  if (LOCAL_FRONTEND_ORIGINS.has(requestOrigin)) {
    return requestOrigin;
  }

  if (configuredOrigin && requestOrigin === configuredOrigin) {
    return requestOrigin;
  }

  return undefined;
}

app.use("/api/*", async (c, next) => {
  const allowedOrigin = getAllowedOrigin(
    c.req.header("Origin"),
    c.env?.FRONTEND_URL
  );

  if (allowedOrigin) {
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    c.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS"
    );
    c.header("Access-Control-Allow-Origin", allowedOrigin);
    c.header("Vary", "Origin");
  }

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
});

app.get(API_HEALTH_PATH, (c) => {
  return c.json({
    environment: c.env?.ENVIRONMENT ?? "development",
    status: "ok",
    service: "promptops-api",
    timestamp: new Date().toISOString()
  });
});

export default app;
