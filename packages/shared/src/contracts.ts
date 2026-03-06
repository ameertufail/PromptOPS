export const API_HEALTH_PATH = "/api/health";

export const SDK_DEFAULT_BASE_URL = "http://localhost:8787";

export type ApiHealthResponse = {
  environment: string;
  status: "ok";
  service: "promptops-api";
  timestamp: string;
};

export type WorkspaceSurface =
  | "WEB_APP"
  | "API_APP"
  | "SDK_PACKAGE"
  | "SHARED_PACKAGE";

export type RunSource = "SDK" | "UI" | "EVAL";

export type LogRunRequest = {
  promptVersionId?: string;
  input: Record<string, unknown>;
  output: string;
  metrics?: {
    latencyMs?: number;
    tokenCount?: number;
    costEstimate?: number;
  };
  metadata?: Record<string, unknown>;
};

export type LogRunResponse = {
  id: string;
  status: "logged";
};
