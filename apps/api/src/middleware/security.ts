import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

const LOCAL_FRONTEND_ORIGINS = new Set([
  "http://127.0.0.1:3000",
  "http://localhost:3000"
]);

function normalizeConfiguredOrigin(origin: string | undefined) {
  if (!origin) {
    return undefined;
  }

  try {
    return new URL(origin).origin;
  } catch {
    return undefined;
  }
}

export function getAllowedOrigin(
  requestOrigin: string | undefined,
  configuredOrigin?: string,
  environment?: string
) {
  if (!requestOrigin) {
    return undefined;
  }

  // In production, only allow the configured FRONTEND_URL — never localhost
  if (environment === "production") {
    if (requestOrigin === normalizeConfiguredOrigin(configuredOrigin)) {
      return requestOrigin;
    }

    return undefined;
  }

  if (LOCAL_FRONTEND_ORIGINS.has(requestOrigin)) {
    return requestOrigin;
  }

  if (requestOrigin === normalizeConfiguredOrigin(configuredOrigin)) {
    return requestOrigin;
  }

  return undefined;
}

export const apiSecurityHeadersMiddleware: MiddlewareHandler<AppEnv> = async (
  c,
  next
) => {
  await next();

  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");

  if (c.env?.ENVIRONMENT === "production") {
    c.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
};

export const apiCorsMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const allowedOrigin = getAllowedOrigin(
    c.req.header("Origin"),
    c.env?.FRONTEND_URL,
    c.env?.ENVIRONMENT
  );

  if (allowedOrigin) {
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    c.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS"
    );
    c.header("Access-Control-Allow-Origin", allowedOrigin);
    c.header("Access-Control-Max-Age", "86400");
    c.header("Vary", "Origin");
  }

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
};
