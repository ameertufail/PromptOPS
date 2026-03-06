import { API_HEALTH_PATH, type ApiHealthResponse } from "@promptops/shared";
import { describe, expect, it } from "vitest";
import app from "./index";

describe("API health endpoint", () => {
  it("returns the expected health payload", async () => {
    const response = await app.request(API_HEALTH_PATH);

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
    const response = await app.request(API_HEALTH_PATH, {
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
    const response = await app.request(API_HEALTH_PATH, {
      headers: {
        Origin: "https://untrusted.example.com"
      }
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
