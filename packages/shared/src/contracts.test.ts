import { describe, expect, it } from "vitest";
import { API_HEALTH_PATH, SDK_DEFAULT_BASE_URL } from "./contracts";

describe("shared contracts", () => {
  it("keeps the API health path stable", () => {
    expect(API_HEALTH_PATH).toBe("/api/health");
  });

  it("uses the local worker URL as the SDK default base URL", () => {
    expect(SDK_DEFAULT_BASE_URL).toBe("http://localhost:8787");
  });
});
