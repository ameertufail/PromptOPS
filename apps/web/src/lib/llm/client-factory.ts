/**
 * LLM client factory.
 * Creates the appropriate provider adapter based on provider type and user's BYOK key.
 */

import type { ProviderType } from "@promptops/shared";
import { AnthropicClient } from "./anthropic-client";
import { GroqClient } from "./groq-client";
import { OpenAIClient } from "./openai-client";
import type { LLMClient, LLMClientConfig } from "./types";

function validateBaseUrl(url: string): void {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  if (
    parsed.protocol !== "https:" &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1"
  ) {
    throw new Error("Custom provider baseUrl must use HTTPS");
  }
  if (
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/.test(
      hostname
    ) ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error(
      "Custom provider baseUrl cannot target private/internal networks"
    );
  }
}

/**
 * Creates an LLM client for the given provider type and API key.
 * OpenAI-compatible providers (TOGETHER, CUSTOM) use the OpenAI adapter
 * with a custom base URL.
 */
export function createLLMClient(config: LLMClientConfig): LLMClient {
  switch (config.provider) {
    case "OPENAI":
      return new OpenAIClient(config);

    case "ANTHROPIC":
      return new AnthropicClient(config);

    case "GROQ":
      return new GroqClient(config);

    case "TOGETHER":
      return new OpenAIClient({
        ...config,
        baseUrl: config.baseUrl ?? "https://api.together.xyz/v1"
      });

    case "CUSTOM":
      if (!config.baseUrl) {
        throw new Error(
          "Custom provider requires a baseUrl in the configuration."
        );
      }
      validateBaseUrl(config.baseUrl);
      return new OpenAIClient(config);

    default:
      throw new Error(`Unsupported provider: ${config.provider as string}`);
  }
}

/**
 * Returns the default model identifier for a given provider type.
 */
export function getDefaultModel(provider: ProviderType): string {
  switch (provider) {
    case "OPENAI":
      return "gpt-4o";
    case "ANTHROPIC":
      return "claude-sonnet-4-20250514";
    case "GROQ":
      return "llama-3.3-70b-versatile";
    case "TOGETHER":
      return "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
    case "CUSTOM":
      return "default";
  }
}
