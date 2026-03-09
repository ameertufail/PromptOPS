import {
  API_HEALTH_PATH,
  type ApiErrorResponse,
  type ApiHealthResponse
} from "@promptops/shared";
import { describe, expect, it } from "vitest";
import { ConflictError } from "./lib/errors";
import { createApp } from "./index";

describe("API app shell", () => {
  it("returns the expected health payload", async () => {
    const response = await createApp().request(API_HEALTH_PATH);

    expect(response.status).toBe(200);

    const payload = (await response.json()) as ApiHealthResponse;

    expect(payload).toMatchObject({
      environment: "development",
      service: "promptops-api",
      status: "ok"
    });
    expect(payload.timestamp).toEqual(expect.any(String));
  });

  it("allows the local frontend origin for credentialed requests", async () => {
    const response = await createApp().request(API_HEALTH_PATH, {
      headers: {
        Origin: "http://localhost:3000"
      }
    });

    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true"
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000"
    );
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  it("does not expose CORS headers to untrusted origins", async () => {
    const response = await createApp().request(API_HEALTH_PATH, {
      headers: {
        Origin: "https://untrusted.example.com"
      }
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("responds to trusted CORS preflight requests", async () => {
    const response = await createApp().request(API_HEALTH_PATH, {
      headers: {
        "Access-Control-Request-Method": "GET",
        Origin: "http://127.0.0.1:3000"
      },
      method: "OPTIONS"
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://127.0.0.1:3000"
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "OPTIONS"
    );
  });

  it("returns standardized not-found errors for unknown API routes", async () => {
    const response = await createApp().request("/api/unknown");

    expect(response.status).toBe(404);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "NOT_FOUND",
      message: "Route GET /api/unknown was not found."
    });
    expect(payload.details).toMatchObject({
      requestId: expect.any(String)
    });
  });

  it("formats thrown domain errors with the shared envelope", async () => {
    const app = createApp({
      configureApp(api) {
        api.get("/api/_test/conflict", () => {
          throw new ConflictError("A conflicting resource already exists.", {
            details: {
              resource: "project"
            }
          });
        });
      }
    });
    const response = await app.request("/api/_test/conflict");

    expect(response.status).toBe(409);

    const payload = (await response.json()) as ApiErrorResponse;

    expect(payload).toMatchObject({
      error: "CONFLICT",
      message: "A conflicting resource already exists."
    });
    expect(payload.details).toMatchObject({
      requestId: expect.any(String),
      resource: "project"
    });
  });
});
