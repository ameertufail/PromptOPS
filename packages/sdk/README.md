# @promptops/sdk

TypeScript SDK for logging LLM runs to [PromptOps Studio](https://github.com/promptops/studio). Lightweight, fire-and-forget safe, and designed to never crash your application.

## Installation

```bash
# From GitHub (MVP)
npm install github:promptops/studio#packages/sdk

# Future npm release
npm install @promptops/sdk
```

## Quick Start

```typescript
import { PromptOpsClient } from "@promptops/sdk";

const client = new PromptOpsClient({
  apiKey: "po_sk_your_api_key_here" // Create in Project Settings
});
```

## API

### `logRun(params)`

Log an LLM run to PromptOps Studio.

```typescript
const result = await client.logRun({
  input: { prompt: "Summarize this document", document: "..." },
  output: "The document discusses...",
  promptVersionId: "optional-version-id",
  metrics: {
    latencyMs: 1200,
    tokenCount: 350,
    costEstimate: 0.002
  },
  metadata: {
    environment: "production",
    userId: "user_123"
  }
});

// result: { id: "run_...", status: "logged" } or null on failure
```

**Behavior:**

- Returns `{ id, status: "logged" }` on success
- Returns `null` on any failure (never throws)
- Retries up to 3 times on 5xx errors with exponential backoff (500ms, 1s, 2s + jitter)
- Logs warnings to console on failure

### `instrumentedGenerate(options)`

Wrap an async LLM call to automatically measure latency and log the run in the background.

```typescript
const response = await client.instrumentedGenerate({
  fn: () =>
    openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello" }]
    }),
  input: { prompt: "Hello" },
  promptVersionId: "version_abc",
  outputExtractor: (result) => result.choices[0].message.content ?? "",
  metadata: { environment: "production" }
});

// response is the raw OpenAI response — logging happens in the background
```

**Behavior:**

- Returns the original function result (logging never blocks your code)
- Automatically measures `latencyMs`
- Calls `logRun` in the background (fire-and-forget)
- If `outputExtractor` is omitted, uses `String(result)`

## Configuration

```typescript
const client = new PromptOpsClient({
  apiKey: "po_sk_...", // Required. Must start with "po_sk_"
  baseUrl: "https://your-api", // Optional. Defaults to production URL
  timeout: 5000 // Optional. Request timeout in ms (default: 5000)
});
```

## Authentication

The SDK authenticates using project-scoped API keys. Create keys in your project's Settings page. Keys are sent as `Authorization: Bearer po_sk_...` headers.

**Rate limit:** 100 requests/minute per API key.

## Error Handling

The SDK is designed to be safe by default:

- `logRun` catches all errors and returns `null` — it never throws
- `instrumentedGenerate` returns the wrapped function's result even if logging fails
- Network errors, timeouts, and non-retryable errors are logged to `console.warn`
- Your application logic is never blocked or affected by SDK failures

## Workspace Rules

- **Allowed imports:** External packages, `@promptops/shared` public exports, local `packages/sdk/src` files
- **Disallowed imports:** Direct imports from `apps/web` or `apps/api`, deep imports from `packages/shared/src/*`

## License

[MIT](../../LICENSE)
