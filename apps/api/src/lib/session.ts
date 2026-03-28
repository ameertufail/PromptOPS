import {
  API_AUTH_BASE_PATH,
  AUTH_CALLBACK_FRONTEND_PATH,
  AUTH_SESSION_COOKIE_NAME,
  type User
} from "@promptops/shared";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import { InternalServerError, ValidationError } from "./errors";
import type { AppEnv } from "../types";

const GITHUB_OAUTH_SCOPE = "user:email";
const OAUTH_STATE_COOKIE_NAME = "po_github_oauth_state";
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type JwtHeader = {
  alg: "HS256";
  typ: "JWT";
};

export type SessionClaims = {
  exp: number;
  iat: number;
  sub: string;
};

type GithubAccessTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

type GithubProfile = {
  avatar_url: string | null;
  email: string | null;
  id: number;
  login: string;
  name: string | null;
};

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const decoded = atob(padded);

  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function encodeJson(value: JwtHeader | SessionClaims) {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string) {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(value))) as T;
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"]
  );
}

async function signValue(value: string, secret: string) {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importHmacKey(secret),
    new TextEncoder().encode(value)
  );

  return toBase64Url(new Uint8Array(signature));
}

async function verifyValue(value: string, signature: string, secret: string) {
  return crypto.subtle.verify(
    "HMAC",
    await importHmacKey(secret),
    fromBase64Url(signature),
    new TextEncoder().encode(value)
  );
}

function isSecureContext(c: Context<AppEnv>) {
  return !c.req.url.startsWith("http://localhost");
}

function getFrontendBaseUrl(c: Context<AppEnv>) {
  return c.env?.FRONTEND_URL ?? "http://localhost:3000";
}

function getBackendBaseUrl(c: Context<AppEnv>) {
  return c.env?.BACKEND_URL ?? new URL(c.req.url).origin;
}

function getRequiredSecret(
  c: Context<AppEnv>,
  name: "GITHUB_CLIENT_ID" | "GITHUB_CLIENT_SECRET" | "JWT_SECRET"
) {
  const value = c.env?.[name];

  if (!value) {
    throw new InternalServerError(`${name} is not configured.`);
  }

  return value;
}

function parseGithubAccessTokenResponse(value: unknown) {
  if (typeof value !== "object" || value === null) {
    throw new ValidationError(
      "GitHub returned an invalid access token payload."
    );
  }

  return value as GithubAccessTokenResponse;
}

function parseGithubProfile(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as GithubProfile).id !== "number" ||
    typeof (value as GithubProfile).login !== "string"
  ) {
    throw new ValidationError("GitHub returned an invalid profile payload.");
  }

  const profile = value as GithubProfile;

  return {
    avatar_url:
      typeof profile.avatar_url === "string" ? profile.avatar_url : null,
    email: typeof profile.email === "string" ? profile.email : null,
    id: profile.id,
    login: profile.login,
    name: typeof profile.name === "string" ? profile.name : null
  } satisfies GithubProfile;
}

function parseGithubEmails(value: unknown) {
  if (!Array.isArray(value)) {
    throw new ValidationError("GitHub returned an invalid email payload.");
  }

  return value
    .filter(
      (entry): entry is GithubEmail =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as GithubEmail).email === "string" &&
        typeof (entry as GithubEmail).primary === "boolean" &&
        typeof (entry as GithubEmail).verified === "boolean"
    )
    .map((entry) => ({
      email: entry.email,
      primary: entry.primary,
      verified: entry.verified
    }));
}

export function getSessionTtlSeconds() {
  return SESSION_TTL_SECONDS;
}

export function getOAuthStateCookieName() {
  return OAUTH_STATE_COOKIE_NAME;
}

export function getSessionCookie(c: Context<AppEnv>) {
  return getCookie(c, AUTH_SESSION_COOKIE_NAME);
}

export function getOAuthStateCookie(c: Context<AppEnv>) {
  return getCookie(c, OAUTH_STATE_COOKIE_NAME);
}

export function buildFrontendCallbackUrl(
  c: Context<AppEnv>,
  params?: Record<string, string>
) {
  const url = new URL(AUTH_CALLBACK_FRONTEND_PATH, getFrontendBaseUrl(c));

  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url;
}

export function buildGithubAuthorizeUrl(c: Context<AppEnv>, state: string) {
  const url = new URL("https://github.com/login/oauth/authorize");

  url.searchParams.set("client_id", getRequiredSecret(c, "GITHUB_CLIENT_ID"));
  url.searchParams.set(
    "redirect_uri",
    `${getBackendBaseUrl(c)}${API_AUTH_BASE_PATH}/callback`
  );
  url.searchParams.set("scope", GITHUB_OAUTH_SCOPE);
  url.searchParams.set("state", state);

  return url;
}

export function setOAuthStateCookie(c: Context<AppEnv>, state: string) {
  setCookie(c, OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    path: API_AUTH_BASE_PATH,
    sameSite: "Lax",
    secure: isSecureContext(c)
  });
}

export function clearOAuthStateCookie(c: Context<AppEnv>) {
  deleteCookie(c, OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    path: API_AUTH_BASE_PATH,
    sameSite: "Lax",
    secure: isSecureContext(c)
  });
}

export function clearSessionCookie(c: Context<AppEnv>) {
  deleteCookie(c, AUTH_SESSION_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: isSecureContext(c)
  });
}

export function createSessionClaims(user: User): SessionClaims {
  const issuedAt = Math.floor(Date.now() / 1000);

  return {
    exp: issuedAt + SESSION_TTL_SECONDS,
    iat: issuedAt,
    sub: user.id
  };
}

export function getSessionExpiryIso(claims: SessionClaims) {
  return new Date(claims.exp * 1000).toISOString();
}

export async function signSessionToken(secret: string, claims: SessionClaims) {
  const header: JwtHeader = {
    alg: "HS256",
    typ: "JWT"
  };
  const unsignedToken = `${encodeJson(header)}.${encodeJson(claims)}`;
  const signature = await signValue(unsignedToken, secret);

  return `${unsignedToken}.${signature}`;
}

export async function verifySessionToken(secret: string, token: string) {
  const [encodedHeader, encodedClaims, signature] = token.split(".");

  if (!encodedHeader || !encodedClaims || !signature) {
    throw new ValidationError("Session token format is invalid.");
  }

  const header = decodeJson<JwtHeader>(encodedHeader);

  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new ValidationError("Session token header is invalid.");
  }

  const isValidSignature = await verifyValue(
    `${encodedHeader}.${encodedClaims}`,
    signature,
    secret
  );

  if (!isValidSignature) {
    throw new ValidationError("Session token signature is invalid.");
  }

  const claims = decodeJson<SessionClaims>(encodedClaims);

  if (claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new ValidationError("Session token has expired.");
  }

  return claims;
}

export function setSessionCookie(
  c: Context<AppEnv>,
  token: string,
  claims: SessionClaims
) {
  setCookie(c, AUTH_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "Lax",
    secure: isSecureContext(c)
  });

  return getSessionExpiryIso(claims);
}

export async function exchangeGithubCode(
  c: Context<AppEnv>,
  code: string,
  state: string
) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    body: JSON.stringify({
      client_id: getRequiredSecret(c, "GITHUB_CLIENT_ID"),
      client_secret: getRequiredSecret(c, "GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: `${getBackendBaseUrl(c)}${API_AUTH_BASE_PATH}/callback`,
      state
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "PromptOps-Studio"
    },
    method: "POST"
  });

  const payload = parseGithubAccessTokenResponse(await response.json());

  if (!response.ok || !payload.access_token) {
    throw new ValidationError(
      payload.error_description ??
        payload.error ??
        "GitHub token exchange failed."
    );
  }

  return payload.access_token;
}

export async function fetchGithubProfile(accessToken: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "PromptOps-Studio"
    }
  });

  if (!response.ok) {
    throw new ValidationError("GitHub profile lookup failed.");
  }

  return parseGithubProfile(await response.json());
}

export async function fetchGithubPrimaryEmail(accessToken: string) {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "PromptOps-Studio"
    }
  });

  if (!response.ok) {
    throw new ValidationError("GitHub email lookup failed.");
  }

  const emails = parseGithubEmails(await response.json());
  const primaryVerifiedEmail =
    emails.find((email) => email.primary && email.verified) ??
    emails.find((email) => email.verified);

  if (!primaryVerifiedEmail) {
    throw new ValidationError(
      "A verified GitHub email is required to sign in."
    );
  }

  return primaryVerifiedEmail.email;
}

export function getJwtSecret(c: Context<AppEnv>) {
  return getRequiredSecret(c, "JWT_SECRET");
}
