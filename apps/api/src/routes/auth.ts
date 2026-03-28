import {
  API_AUTH_BASE_PATH,
  authGithubCallbackQuerySchema,
  authLogoutResponseSchema,
  authSessionResponseSchema
} from "@promptops/shared";
import { Hono, type Context } from "hono";
import { upsertUser } from "../db/queries";
import { AuthenticationError } from "../lib/errors";
import {
  buildFrontendCallbackUrl,
  buildGithubAuthorizeUrl,
  clearOAuthStateCookie,
  clearSessionCookie,
  createSessionClaims,
  exchangeGithubCode,
  fetchGithubPrimaryEmail,
  fetchGithubProfile,
  getJwtSecret,
  getOAuthStateCookie,
  setOAuthStateCookie,
  setSessionCookie,
  signSessionToken
} from "../lib/session";
import { getRequestContext } from "../lib/request-context";
import { parseWithSchema } from "../lib/validation";
import {
  requireDatabaseBinding,
  requireSessionIdentity
} from "../middleware/auth";
import type { AppEnv } from "../types";

export const authRoutes = new Hono<AppEnv>();

function redirectToFrontendCallback(
  c: Context<AppEnv>,
  params?: Record<string, string>
) {
  return c.redirect(buildFrontendCallbackUrl(c, params).toString(), 302);
}

function getNormalizedCallbackQuery(c: Context<AppEnv>) {
  const url = new URL(c.req.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());

  if ("error_description" in rawQuery) {
    rawQuery.errorDescription = rawQuery.error_description;
    delete rawQuery.error_description;
  }

  return parseWithSchema(
    authGithubCallbackQuerySchema,
    rawQuery,
    "Invalid GitHub callback parameters."
  );
}

authRoutes.get(`${API_AUTH_BASE_PATH}/github`, (c) => {
  const state = crypto.randomUUID();

  setOAuthStateCookie(c, state);

  return c.redirect(buildGithubAuthorizeUrl(c, state).toString(), 302);
});

authRoutes.get(`${API_AUTH_BASE_PATH}/callback`, async (c) => {
  const callbackQuery = getNormalizedCallbackQuery(c);

  if ("error" in callbackQuery) {
    clearOAuthStateCookie(c);
    clearSessionCookie(c);

    return redirectToFrontendCallback(c, {
      error: callbackQuery.error
    });
  }

  const storedState = getOAuthStateCookie(c);

  if (!storedState || storedState !== callbackQuery.state) {
    clearOAuthStateCookie(c);
    clearSessionCookie(c);

    return redirectToFrontendCallback(c, {
      error: "oauth_state_mismatch"
    });
  }

  try {
    const accessToken = await exchangeGithubCode(
      c,
      callbackQuery.code,
      callbackQuery.state
    );
    const githubProfile = await fetchGithubProfile(accessToken);
    const email =
      githubProfile.email ?? (await fetchGithubPrimaryEmail(accessToken));
    const user = await upsertUser(requireDatabaseBinding(c), {
      avatarUrl: githubProfile.avatar_url,
      email,
      githubId: githubProfile.id,
      name: githubProfile.name ?? githubProfile.login
    });
    const sessionClaims = createSessionClaims({
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      email: user.email,
      githubId: user.github_id,
      id: user.id,
      name: user.name
    });
    const sessionToken = await signSessionToken(getJwtSecret(c), sessionClaims);

    clearOAuthStateCookie(c);
    setSessionCookie(c, sessionToken, sessionClaims);

    return redirectToFrontendCallback(c, {});
  } catch (error) {
    console.error("[auth] OAuth callback failed:", error instanceof Error ? error.message : error);
    clearOAuthStateCookie(c);
    clearSessionCookie(c);

    return redirectToFrontendCallback(c, {
      error: "auth_callback_failed"
    });
  }
});

authRoutes.get(`${API_AUTH_BASE_PATH}/me`, requireSessionIdentity(), (c) => {
  const requestContext = getRequestContext(c);

  if (!requestContext.user || !requestContext.sessionExpiresAt) {
    throw new AuthenticationError("A valid dashboard session is required.");
  }

  return c.json(
    authSessionResponseSchema.parse({
      expiresAt: requestContext.sessionExpiresAt,
      user: requestContext.user
    })
  );
});

authRoutes.post(`${API_AUTH_BASE_PATH}/logout`, requireSessionIdentity(), (c) => {
  clearSessionCookie(c);

  return c.json(authLogoutResponseSchema.parse({ success: true }));
});
