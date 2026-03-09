import { AUTH_SESSION_COOKIE_NAME, type ApiErrorResponse } from "@promptops/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createResult, MockDb } from "../test-utils/d1";
import { createApp, type AppBindings } from "../index";
import {
  createSessionClaims,
  getOAuthStateCookieName,
  signSessionToken
} from "../lib/session";

describe("auth routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("redirects to GitHub and stores an OAuth state cookie", async () => {
    const response = await createApp().request(
      "http://localhost:8787/api/auth/github",
      undefined,
      {
        GITHUB_CLIENT_ID: "github-client-id"
      } as AppBindings
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain(
      "https://github.com/login/oauth/authorize"
    );
    expect(response.headers.get("location")).toContain(
      "client_id=github-client-id"
    );
    expect(response.headers.get("location")).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A8787%2Fapi%2Fauth%2Fcallback"
    );
    expect(response.headers.get("set-cookie")).toContain(
      `${getOAuthStateCookieName()}=`
    );
  });

  it("redirects back to the frontend when OAuth state validation fails", async () => {
    const response = await createApp().request(
      "http://localhost:8787/api/auth/callback?code=abc123&state=wrong-state",
      {
        headers: {
          Cookie: `${getOAuthStateCookieName()}=expected-state`
        }
      }
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/callback?error=oauth_state_mismatch"
    );
  });

  it("exchanges the GitHub code, upserts the user, and issues a session cookie", async () => {
    const upsertedUser = {
      avatar_url: "https://avatars.example/alice.png",
      created_at: "2026-03-08T12:00:00.000Z",
      email: "alice@example.com",
      github_id: 42,
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      name: "Alice"
    };
    const db = new MockDb([[createResult([]), createResult([upsertedUser])]]);
    const fetchMock = vi.fn<
      typeof fetch
    >()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "gho_token" }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            avatar_url: upsertedUser.avatar_url,
            email: upsertedUser.email,
            id: upsertedUser.github_id,
            login: "alice",
            name: upsertedUser.name
          }),
          {
            status: 200
          }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const response = await createApp().request(
      "http://localhost:8787/api/auth/callback?code=abc123&state=expected-state",
      {
        headers: {
          Cookie: `${getOAuthStateCookieName()}=expected-state`
        }
      },
      {
        DB: db as unknown as D1Database,
        GITHUB_CLIENT_ID: "github-client-id",
        GITHUB_CLIENT_SECRET: "github-client-secret",
        JWT_SECRET: "jwt-secret"
      } as AppBindings
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost:3000/callback");
    expect(response.headers.get("set-cookie")).toContain(
      `${AUTH_SESSION_COOKIE_NAME}=`
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(db.sessionConstraints).toEqual(["first-primary"]);
  });

  it("returns the active session for /api/auth/me when the cookie is valid", async () => {
    const user = {
      avatar_url: "https://avatars.example/alice.png",
      created_at: "2026-03-08T12:00:00.000Z",
      email: "alice@example.com",
      github_id: 42,
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      name: "Alice"
    };
    const token = await signSessionToken(
      "jwt-secret",
      createSessionClaims({
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        email: user.email,
        githubId: user.github_id,
        id: user.id,
        name: user.name
      })
    );
    const response = await createApp().request(
      "http://localhost:8787/api/auth/me",
      {
        headers: {
          Cookie: `${AUTH_SESSION_COOKIE_NAME}=${token}`
        }
      },
      {
        DB: new MockDb([], [user]) as unknown as D1Database,
        JWT_SECRET: "jwt-secret"
      } as AppBindings
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      expiresAt: expect.any(String),
      user: {
        email: "alice@example.com",
        githubId: 42,
        id: user.id,
        name: "Alice"
      }
    });
  });

  it("returns 401 from /api/auth/me when no valid session exists", async () => {
    const response = await createApp().request("http://localhost:8787/api/auth/me");

    expect(response.status).toBe(401);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "UNAUTHORIZED"
    });
  });

  it("clears the session cookie on logout and returns success", async () => {
    const response = await createApp().request(
      "http://localhost:8787/api/auth/logout",
      {
        method: "POST"
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(response.headers.get("set-cookie")).toContain(
      `${AUTH_SESSION_COOKIE_NAME}=`
    );
  });
});
