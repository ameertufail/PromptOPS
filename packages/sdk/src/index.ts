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
  onLogError?: (error: unknown) => void;
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
  private readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeout: number;
  private readonly onLogError?: (error: unknown) => void;

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
    this.onLogError = config.onLogError;

    if (
      !this.baseUrl.startsWith("https://") &&
      !this.baseUrl.includes("localhost") &&
      !this.baseUrl.includes("127.0.0.1")
    ) {
      console.warn(
        "[PromptOps SDK] Warning: baseUrl is not using HTTPS. API keys will be sent over an insecure connection."
      );
    }
  }

  async logRun(params: LogRunRequest): Promise<LogRunResponse | null> {
    if (!params.projectId || !params.promptId) {
      console.warn(
        "[PromptOps SDK] logRun: missing required fields (projectId, promptId)"
      );
      return null;
    }

    const url = `${this.baseUrl}${API_RUNS_PATH}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(params),
            signal: controller.signal
          });

          if (response.ok) {
            const data = await response.json();
            if (data && typeof data === "object" && "id" in data) {
              return data as LogRunResponse;
            }
            console.warn("[PromptOps SDK] logRun: unexpected response shape");
            return null;
          }

          if (!isRetryableStatus(response.status) || attempt === MAX_RETRIES) {
            console.warn(
              `[PromptOps SDK] logRun failed with status ${response.status}`
            );
            return null;
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          console.warn(
            "[PromptOps SDK] logRun failed after retries:",
            error instanceof Error ? error.message : "Unknown error"
          );
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
    }).catch((err) => {
      this.onLogError?.(err);
    });

    return result;
  }
}
