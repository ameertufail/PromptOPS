/**
 * Anthropic provider adapter.
 * Calls the Anthropic Messages API directly from the browser using the user's BYOK key.
 */

import type {
  LLMClient,
  LLMClientConfig,
  LLMGenerateRequest,
  LLMGenerateResponse
} from "./types";

const ANTHROPIC_DEFAULT_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_API_VERSION = "2023-06-01";

export class AnthropicClient implements LLMClient {
  readonly provider = "ANTHROPIC" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LLMClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? ANTHROPIC_DEFAULT_BASE_URL;
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    const startMs = performance.now();

    const body: Record<string, unknown> = {
      model: request.model,
      messages: [{ role: "user", content: request.prompt }],
      max_tokens: request.maxTokens ?? 4096
    };

    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });

    if (!res.ok) {
      const errorBody = await res.text();
      const safeBody = errorBody
        .slice(0, 500)
        .replace(this.apiKey, "[REDACTED]");
      throw new Error(`Anthropic API error ${res.status}: ${safeBody}`);
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    if (!data.content?.length || !data.content[0]?.text) {
      throw new Error("Invalid LLM response: missing or empty content");
    }

    const latencyMs = Math.round(performance.now() - startMs);
    const textBlock = data.content.find((b) => b.type === "text");
    const output = textBlock?.text ?? "";
    const tokenCount = data.usage
      ? data.usage.input_tokens + data.usage.output_tokens
      : undefined;

    return { output, latencyMs, tokenCount };
  }
}
