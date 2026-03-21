import {
  API_RUNS_PATH,
  SDK_DEFAULT_BASE_URL,
  SDK_DEFAULT_TIMEOUT_MS,
  type JsonObject,
  type LogRunRequest,
  type LogRunResponse
} from "@promptops/shared";

export type PromptOpsClientConfig = {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
};

export type InstrumentedGenerateOptions<T> = {
  fn: () => Promise<T>;
  input: JsonObject;
  metadata?: JsonObject;
  promptVersionId?: string;
  outputExtractor?: (result: T) => string;
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function isRetryableStatus(status: number) {
  return status >= 500 && status < 600;
}

function computeDelay(attempt: number) {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * BASE_DELAY_MS;
  return exponential + jitter;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PromptOpsClient {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeout: number;

  constructor(config: PromptOpsClientConfig) {
    if (!config.apiKey) {
      throw new Error("PromptOpsClient requires an apiKey.");
    }

    if (!config.apiKey.startsWith("po_sk_")) {
      throw new Error('Invalid API key format. Keys must start with "po_sk_".');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? SDK_DEFAULT_BASE_URL;
    this.timeout = config.timeout ?? SDK_DEFAULT_TIMEOUT_MS;
  }

  async logRun(params: LogRunRequest): Promise<LogRunResponse | null> {
    const url = `${this.baseUrl}${API_RUNS_PATH}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(params),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return (await response.json()) as LogRunResponse;
        }

        if (!isRetryableStatus(response.status) || attempt === MAX_RETRIES) {
          console.warn(
            `[PromptOps SDK] logRun failed with status ${response.status}`
          );
          return null;
        }
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          console.warn("[PromptOps SDK] logRun failed after retries:", error);
          return null;
        }
      }

      await sleep(computeDelay(attempt));
    }

    return null;
  }

  async instrumentedGenerate<T>(
    options: InstrumentedGenerateOptions<T>
  ): Promise<T> {
    const start = Date.now();
    const result = await options.fn();
    const latencyMs = Date.now() - start;

    const output = options.outputExtractor
      ? options.outputExtractor(result)
      : String(result);

    // Fire-and-forget: do not await, never throw
    this.logRun({
      input: options.input,
      output,
      promptVersionId: options.promptVersionId,
      metadata: options.metadata,
      metrics: { latencyMs }
    }).catch(() => {
      // Intentionally swallowed - SDK logging should never crash user's app
    });

    return result;
  }
}
