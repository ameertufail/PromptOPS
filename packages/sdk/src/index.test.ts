import { SDK_DEFAULT_BASE_URL } from "@promptops/shared";
import { describe, expect, it } from "vitest";
import { PromptOpsClient } from "./index";

describe("PromptOpsClient", () => {
  it("keeps the provided API key", () => {
    const client = new PromptOpsClient({ apiKey: "po_sk_test" });

    expect(client.apiKey).toBe("po_sk_test");
  });

  it("falls back to the local API URL when no base URL is provided", () => {
    const client = new PromptOpsClient({ apiKey: "po_sk_test" });

    expect(client.baseUrl).toBe(SDK_DEFAULT_BASE_URL);
  });

  it("honors an explicit base URL override", () => {
    const client = new PromptOpsClient({
      apiKey: "po_sk_test",
      baseUrl: "https://example.com"
    });

    expect(client.baseUrl).toBe("https://example.com");
  });
});
