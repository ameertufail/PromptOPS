import type { Context, MiddlewareHandler } from "hono";
import { getUserById } from "../db/queries";
import {
  AuthenticationError,
  InternalServerError,
  ValidationError
} from "../lib/errors";
import {
  clearAuthenticatedUser,
  getRequestContext,
  setAuthenticatedUser,
  setRequestIdentity
} from "../lib/request-context";
import { toUser } from "../lib/serializers";
import {
  clearSessionCookie,
  getSessionCookie,
  getSessionExpiryIso,
  verifySessionToken
} from "../lib/session";
import type { ApiKeyIdentity, AppEnv, SessionIdentity } from "../types";

type RequireIdentityOptions = {
  allowApiKey?: boolean;
  message?: string;
};

function getBearerSessionToken(c: Context<AppEnv>) {
  const authorizationHeader = c.req.header("Authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  if (!token || token.startsWith("po_sk_")) {
    return undefined;
  }

  return token;
}

export const resolveRequestIdentity: MiddlewareHandler<AppEnv> = async (c, next) => {
  const sessionToken = getSessionCookie(c) ?? getBearerSessionToken(c);

  if (!sessionToken || !c.env?.JWT_SECRET || !c.env?.DB) {
    await next();
    return;
  }

  try {
    const claims = await verifySessionToken(c.env.JWT_SECRET, sessionToken);
    const user = await getUserById(c.env.DB, { userId: claims.sub });

    if (!user) {
      setRequestIdentity(c, { kind: "anonymous" });
      clearAuthenticatedUser(c);
      clearSessionCookie(c);
      await next();
      return;
    }

    authenticateSession(c, user.id);
    setAuthenticatedUser(c, toUser(user), getSessionExpiryIso(claims));
  } catch {
    setRequestIdentity(c, { kind: "anonymous" });
    clearAuthenticatedUser(c);
    clearSessionCookie(c);
  }

  await next();
};

export function authenticateSession(c: Context<AppEnv>, userId: string) {
  const identity: SessionIdentity = {
    kind: "session",
    userId
  };

  setRequestIdentity(c, identity);
}

export function authenticateApiKey(
  c: Context<AppEnv>,
  identity: Omit<ApiKeyIdentity, "kind">
) {
  setRequestIdentity(c, {
    ...identity,
    kind: "api_key"
  });
}

export function requireIdentity(options: RequireIdentityOptions = {}) {
  return (async (c, next) => {
    const { identity } = getRequestContext(c);

    if (identity.kind === "anonymous") {
      throw new AuthenticationError(
        options.message ?? "Authentication is required for this route."
      );
    }

    if (identity.kind === "api_key" && !options.allowApiKey) {
      throw new AuthenticationError(
        options.message ?? "A dashboard session is required for this route."
      );
    }

    await next();
  }) satisfies MiddlewareHandler<AppEnv>;
}

export function requireSessionIdentity(message?: string) {
  return requireIdentity({
    allowApiKey: false,
    message
  });
}

export function requireApiKeyIdentity(message?: string) {
  return (async (c, next) => {
    const { identity } = getRequestContext(c);

    if (identity.kind !== "api_key") {
      throw new AuthenticationError(
        message ?? "An API key is required for this route."
      );
    }

    await next();
  }) satisfies MiddlewareHandler<AppEnv>;
}

export function requireRouteParam(paramName: string, value: string | undefined) {
  if (!value) {
    throw new ValidationError(`Missing required route parameter "${paramName}".`);
  }

  return value;
}

export function requireDatabaseBinding(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    throw new InternalServerError("Database binding is not configured.");
  }

  return c.env.DB;
}
