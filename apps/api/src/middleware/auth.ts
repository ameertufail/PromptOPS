import type { Context, MiddlewareHandler } from "hono";
import {
  getApiKeyByHash,
  hashKey,
  updateApiKeyLastUsed
} from "../db/api-key-queries";
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

function getBearerToken(c: Context<AppEnv>) {
  const authorizationHeader = c.req.header("Authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.slice("Bearer ".length).trim() || undefined;
}

export const resolveRequestIdentity: MiddlewareHandler<AppEnv> = async (
  c,
  next
) => {
  const db = c.env?.DB;
  const bearerToken = getBearerToken(c);

  // Handle API key authentication (po_sk_ prefix)
  if (bearerToken?.startsWith("po_sk_") && db) {
    try {
      const keyHash = await hashKey(bearerToken);
      const apiKey = await getApiKeyByHash(db, { keyHash });

      if (apiKey) {
        authenticateApiKey(c, {
          apiKeyId: apiKey.id,
          keyPrefix: apiKey.key_prefix,
          projectId: apiKey.project_id
        });

        // Fire-and-forget last_used_at update
        c.executionCtx.waitUntil(
          updateApiKeyLastUsed(db, { keyId: apiKey.id })
        );

        await next();
        return;
      }
    } catch (error) {
      console.error("[auth] Authentication error:", error instanceof Error ? error.message : "unknown");
      // Fall through to anonymous
    }

    await next();
    return;
  }

  // Handle session authentication (cookie or non-po_sk_ bearer)
  const sessionToken =
    getSessionCookie(c) ??
    (bearerToken && !bearerToken.startsWith("po_sk_")
      ? bearerToken
      : undefined);

  if (!sessionToken || !c.env?.JWT_SECRET || !db) {
    await next();
    return;
  }

  try {
    const claims = await verifySessionToken(c.env.JWT_SECRET, sessionToken);
    const user = await getUserById(db, { userId: claims.sub });

    if (!user) {
      setRequestIdentity(c, { kind: "anonymous" });
      clearAuthenticatedUser(c);
      clearSessionCookie(c);
      await next();
      return;
    }

    authenticateSession(c, user.id);
    setAuthenticatedUser(c, toUser(user), getSessionExpiryIso(claims));
  } catch (error) {
    console.error("[auth] Authentication error:", error instanceof Error ? error.message : "unknown");
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

export function requireRouteParam(
  paramName: string,
  value: string | undefined
) {
  if (!value) {
    throw new ValidationError(
      `Missing required route parameter "${paramName}".`
    );
  }

  return value;
}

export function requireDatabaseBinding(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    throw new InternalServerError("Database binding is not configured.");
  }

  return c.env.DB;
}
