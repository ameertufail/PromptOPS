export const API_BASE_PATH = "/api";
export const API_HEALTH_PATH = `${API_BASE_PATH}/health`;
export const API_AUTH_BASE_PATH = `${API_BASE_PATH}/auth`;
export const API_RUNS_PATH = `${API_BASE_PATH}/runs`;
export const AUTH_CALLBACK_FRONTEND_PATH = "/callback";
export const AUTH_SESSION_COOKIE_NAME = "po_session";

export const SDK_DEFAULT_BASE_URL = "http://localhost:8787";
export const SDK_DEFAULT_TIMEOUT_MS = 5_000;

export const SHARED_CONTRACT_VERSION = 1;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export const WORKSPACE_SURFACES = [
  "WEB_APP",
  "API_APP",
  "SDK_PACKAGE",
  "SHARED_PACKAGE"
] as const;

export const USER_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

export const PROMPT_VERSION_STATUSES = [
  "DRAFT",
  "RELEASED",
  "ARCHIVED"
] as const;

export const DATASET_TYPES = [
  "GENERATION",
  "EXTRACTION",
  "CLASSIFICATION"
] as const;

export const EVAL_RUN_STATUSES = [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED"
] as const;

export const EVAL_RUN_ITEM_VERDICTS = [
  "IMPROVED",
  "REGRESSED",
  "SAME",
  "UNKNOWN"
] as const;

export const RUN_SOURCES = ["SDK", "UI", "EVAL"] as const;

export const PROVIDER_TYPES = [
  "OPENAI",
  "ANTHROPIC",
  "GROQ",
  "TOGETHER",
  "CUSTOM"
] as const;

export const JUDGE_PROVIDERS = ["user_key", "workers_ai"] as const;

export const DIFF_HUNK_TYPES = ["added", "removed", "unchanged"] as const;

export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR"
] as const;

export const API_CONTRACT_METHODS = [
  "GET",
  "POST",
  "PATCH",
  "DELETE"
] as const;

export const CONTRACT_RESPONSE_MODES = ["json", "redirect", "empty"] as const;
