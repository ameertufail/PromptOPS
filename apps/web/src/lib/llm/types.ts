/**
 * Browser-side LLM client abstraction types.
 * Provider-agnostic interface for generating completions from the browser using BYOK keys.
 */

import type { ProviderType } from "@promptops/shared";

export interface LLMGenerateRequest {
  /** The rendered prompt content to send */
  prompt: string;
  /** Model identifier (e.g. "gpt-4o", "claude-sonnet-4-20250514") */
  model: string;
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p nucleus sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Optional system message for the request */
  systemPrompt?: string;
}

export interface LLMGenerateResponse {
  /** The generated text output */
  output: string;
  /** Latency of the API call in milliseconds */
  latencyMs: number;
  /** Approximate token count (input + output) when available */
  tokenCount?: number;
}

export interface LLMClient {
  /** The provider type this client handles */
  provider: ProviderType;
  /** Generate a completion from the LLM */
  generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse>;
}

export interface LLMClientConfig {
  /** The provider type */
  provider: ProviderType;
  /** The user's API key (BYOK) */
  apiKey: string;
  /** Optional base URL override */
  baseUrl?: string;
}
