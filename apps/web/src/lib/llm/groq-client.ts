/**
 * Groq provider adapter.
 * Uses the OpenAI-compatible Chat Completions API with Groq's base URL.
 */

import type {
  LLMClient,
  LLMClientConfig,
  LLMGenerateRequest,
  LLMGenerateResponse
} from "./types";

const GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

export class GroqClient implements LLMClient {
  readonly provider = "GROQ" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LLMClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? GROQ_DEFAULT_BASE_URL;
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    const startMs = performance.now();

    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }

    messages.push({ role: "user", content: request.prompt });

    const body: Record<string, unknown> = {
      model: request.model,
      messages
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    }
    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `Groq API error ${res.status}: ${errorBody.slice(0, 500)}`
      );
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };

    const latencyMs = Math.round(performance.now() - startMs);
    const output = data.choices[0]?.message?.content ?? "";
    const tokenCount = data.usage?.total_tokens;

    return { output, latencyMs, tokenCount };
  }
}
