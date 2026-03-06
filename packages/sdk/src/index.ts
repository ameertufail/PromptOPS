import {
  SDK_DEFAULT_BASE_URL,
  type LogRunRequest,
  type LogRunResponse
} from "@promptops/shared";

export type PromptOpsClientConfig = {
  apiKey: string;
  baseUrl?: string;
};

export class PromptOpsClient {
  readonly apiKey: string;
  readonly baseUrl: string;

  constructor(config: PromptOpsClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? SDK_DEFAULT_BASE_URL;
  }

  async logRun(_params: LogRunRequest): Promise<LogRunResponse> {
    throw new Error("SDK logging implementation is planned for later phases.");
  }
}
