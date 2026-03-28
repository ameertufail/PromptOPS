import { Hono, type MiddlewareHandler } from "hono";
import {
  normalizeError,
  NotFoundError,
  toApiErrorResponse
} from "./lib/errors";
import {
  createRequestContext,
  maybeGetRequestContext
} from "./lib/request-context";
import { auditMiddleware } from "./middleware/audit";
import { resolveRequestIdentity } from "./middleware/auth";
import {
  apiCorsMiddleware,
  apiSecurityHeadersMiddleware
} from "./middleware/security";
import { registerRoutes } from "./routes";
import type { AppBindings, AppEnv } from "./types";

type CreateAppOptions = {
  configureApp?: (app: Hono<AppEnv>) => void;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidRequestId(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 128 && UUID_PATTERN.test(trimmed);
}

const requestContextMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const clientId = c.req.header("X-Request-Id");
  const requestId = isValidRequestId(clientId) ? clientId.trim() : crypto.randomUUID();

  c.header("X-Request-Id", requestId);
  c.set("requestContext", createRequestContext(requestId));

  await next();
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono<AppEnv>();

  app.use("*", requestContextMiddleware);
  app.use("/api/*", apiSecurityHeadersMiddleware);
  app.use("/api/*", apiCorsMiddleware);
  app.use("/api/*", resolveRequestIdentity);
  app.use("/api/*", auditMiddleware);

  registerRoutes(app);
  options.configureApp?.(app);

  app.notFound((c) => {
    const requestContext = maybeGetRequestContext(c);
    const normalizedError = normalizeError(
      new NotFoundError(
        `Route ${c.req.method} ${new URL(c.req.url).pathname} was not found.`
      ),
      requestContext?.requestId
    );

    Object.entries(normalizedError.headers).forEach(([name, value]) => {
      c.header(name, value);
    });

    return c.json(toApiErrorResponse(normalizedError), normalizedError.status);
  });

  app.onError((error, c) => {
    const requestContext = maybeGetRequestContext(c);
    const normalizedError = normalizeError(error, requestContext?.requestId);

    Object.entries(normalizedError.headers).forEach(([name, value]) => {
      c.header(name, value);
    });

    return c.json(toApiErrorResponse(normalizedError), normalizedError.status);
  });

  return app;
}

const app = createApp();

export default app;
export type { AppBindings, AppEnv };
