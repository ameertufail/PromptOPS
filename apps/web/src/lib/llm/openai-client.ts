/**
 * OpenAI provider adapter.
 * Calls the OpenAI Chat Completions API directly from the browser using the user's BYOK key.
 */

import type {
  LLMClient,
  LLMClientConfig,
  LLMGenerateRequest,
  LLMGenerateResponse
} from "./types";

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";

export class OpenAIClient implements LLMClient {
  readonly provider = "OPENAI" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LLMClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? OPENAI_DEFAULT_BASE_URL;
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
    if (request.frequencyPenalty !== undefined) {
      body.frequency_penalty = request.frequencyPenalty;
    }
    if (request.presencePenalty !== undefined) {
      body.presence_penalty = request.presencePenalty;
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
        `OpenAI API error ${res.status}: ${errorBody.slice(0, 500)}`
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
