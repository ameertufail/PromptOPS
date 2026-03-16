/**
 * Basic SDK logging example.
 *
 * Prerequisites:
 *   1. Start the local API: pnpm --filter @promptops/api dev
 *   2. Create a project and generate an API key in the dashboard
 *   3. Replace the apiKey below with your key
 *
 * Run:
 *   npx tsx packages/sdk/examples/basic-logging.ts
 */

import { PromptOpsClient } from "../src/index";

const client = new PromptOpsClient({
  apiKey: "po_sk_REPLACE_WITH_YOUR_KEY_HERE_____",
  baseUrl: "http://localhost:8787"
});

// ── Example 1: Direct logRun ────────────────────────────────────────────

async function directLog() {
  console.log("Logging a run directly...");

  const result = await client.logRun({
    input: { prompt: "Summarize this article", article: "..." },
    output: "This article discusses...",
    promptVersionId: undefined,
    metadata: { environment: "development", userId: "user-123" },
    metrics: {
      latencyMs: 342,
      tokenCount: 150,
      costEstimate: 0.002
    }
  });

  if (result) {
    console.log(`Run logged: ${result.id} (status: ${result.status})`);
  } else {
    console.log("Run logging failed (non-fatal).");
  }
}

// ── Example 2: Instrumented wrapper ─────────────────────────────────────

async function instrumentedExample() {
  console.log("\nUsing instrumentedGenerate wrapper...");

  // Simulate an LLM call
  async function fakeLlmCall() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { text: "The answer is 42.", tokens: 8 };
  }

  const result = await client.instrumentedGenerate({
    fn: fakeLlmCall,
    input: { prompt: "What is the meaning of life?" },
    outputExtractor: (r) => r.text,
    metadata: { model: "gpt-4", environment: "development" }
  });

  console.log(`LLM result: ${result.text}`);
  console.log("(Run logged in background — never blocks your app)");
}

// ── Run ─────────────────────────────────────────────────────────────────

async function main() {
  await directLog();
  await instrumentedExample();
}

main().catch(console.error);
