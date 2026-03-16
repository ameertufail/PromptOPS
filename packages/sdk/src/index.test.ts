import {
  SDK_DEFAULT_BASE_URL,
  SDK_DEFAULT_TIMEOUT_MS
} from "@promptops/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PromptOpsClient } from "./index";

describe("PromptOpsClient", () => {
  it("keeps the provided API key", () => {
    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    });

    expect(client.apiKey).toBe("po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  });

  it("falls back to the local API URL when no base URL is provided", () => {
    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    });

    expect(client.baseUrl).toBe(SDK_DEFAULT_BASE_URL);
  });

  it("honors an explicit base URL override", () => {
    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      baseUrl: "https://example.com"
    });

    expect(client.baseUrl).toBe("https://example.com");
  });

  it("uses the default timeout", () => {
    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    });

    expect(client.timeout).toBe(SDK_DEFAULT_TIMEOUT_MS);
  });

  it("honors an explicit timeout", () => {
    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      timeout: 10_000
    });

    expect(client.timeout).toBe(10_000);
  });

  it("throws on missing API key", () => {
    expect(() => new PromptOpsClient({ apiKey: "" })).toThrow(
      "PromptOpsClient requires an apiKey."
    );
  });

  it("throws on invalid API key format", () => {
    expect(() => new PromptOpsClient({ apiKey: "sk_test_123" })).toThrow(
      'Invalid API key format. Keys must start with "po_sk_".'
    );
  });
});

describe("PromptOpsClient.logRun", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("sends a POST to /api/runs with authorization header", async () => {
    const captured: { url: string; init: RequestInit }[] = [];

    globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit
    ) => {
      captured.push({ url: url.toString(), init: init! });
      return new Response(JSON.stringify({ id: "abc", status: "logged" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      baseUrl: "https://api.test"
    });

    const result = await client.logRun({
      input: { prompt: "hello" },
      output: "world"
    });

    expect(result).toEqual({ id: "abc", status: "logged" });
    expect(captured.length).toBe(1);
    expect(captured[0].url).toBe("https://api.test/api/runs");
    expect(
      (captured[0].init.headers as Record<string, string>).Authorization
    ).toBe("Bearer po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  });

  it("returns null on 4xx errors without retrying", async () => {
    let callCount = 0;

    globalThis.fetch = (async () => {
      callCount++;
      return new Response(JSON.stringify({ error: "FORBIDDEN" }), {
        status: 403
      });
    }) as typeof fetch;

    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      baseUrl: "https://api.test"
    });

    const result = await client.logRun({
      input: { prompt: "test" },
      output: "out"
    });

    expect(result).toBeNull();
    expect(callCount).toBe(1);
  });

  it("retries on 5xx errors", async () => {
    let callCount = 0;

    globalThis.fetch = (async () => {
      callCount++;
      if (callCount <= 2) {
        return new Response("Internal Server Error", { status: 500 });
      }
      return new Response(JSON.stringify({ id: "ok", status: "logged" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      baseUrl: "https://api.test"
    });

    const result = await client.logRun({
      input: { prompt: "retry" },
      output: "val"
    });

    expect(result).toEqual({ id: "ok", status: "logged" });
    expect(callCount).toBe(3);
  });

  it("returns null after exhausting retries", async () => {
    globalThis.fetch = (async () => {
      return new Response("Internal Server Error", { status: 500 });
    }) as typeof fetch;

    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      baseUrl: "https://api.test"
    });

    const result = await client.logRun({
      input: { prompt: "fail" },
      output: "out"
    });

    expect(result).toBeNull();
  }, 15_000);
});

describe("PromptOpsClient.instrumentedGenerate", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns the LLM output and fires logRun in background", async () => {
    const logCalls: unknown[] = [];

    globalThis.fetch = (async (
      _url: string | URL | Request,
      init?: RequestInit
    ) => {
      logCalls.push(JSON.parse(init?.body as string));
      return new Response(JSON.stringify({ id: "run1", status: "logged" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      baseUrl: "https://api.test"
    });

    const result = await client.instrumentedGenerate({
      fn: async () => "Generated text",
      input: { prompt: "hello" }
    });

    expect(result).toBe("Generated text");

    // Wait for fire-and-forget to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(logCalls.length).toBe(1);
    expect((logCalls[0] as Record<string, unknown>).output).toBe(
      "Generated text"
    );
  });

  it("uses custom outputExtractor", async () => {
    const logCalls: unknown[] = [];

    globalThis.fetch = (async (
      _url: string | URL | Request,
      init?: RequestInit
    ) => {
      logCalls.push(JSON.parse(init?.body as string));
      return new Response(JSON.stringify({ id: "run1", status: "logged" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    const client = new PromptOpsClient({
      apiKey: "po_sk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      baseUrl: "https://api.test"
    });

    const result = await client.instrumentedGenerate({
      fn: async () => ({ text: "response", tokens: 42 }),
      input: { prompt: "test" },
      outputExtractor: (r) => r.text
    });

    expect(result).toEqual({ text: "response", tokens: 42 });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect((logCalls[0] as Record<string, unknown>).output).toBe("response");
  });
});
