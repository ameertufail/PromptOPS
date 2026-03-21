import { API_BASE_PATH } from "@promptops/shared";
import type { ApiErrorResponse } from "@promptops/shared";

// In production, API calls use relative paths (/api/...) so they go through
// the Next.js rewrite proxy, keeping cookies on the same domain.
// In development, calls go directly to the local API server.
const API_URL = process.env.NEXT_PUBLIC_API_URL ? "" : "http://localhost:8787";

const SESSION_TOKEN_KEY = "po_session_token";

export function storeSessionToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

export function clearSessionToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
}

function getSessionToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown
  ) {
    super(`API Error ${status}: ${code}`);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  params?: Record<string, string>;
};

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, headers: customHeaders, ...rest } = options;

  let url = `${API_URL}${path}`;
  if (params) {
    const search = new URLSearchParams(params);
    url += `?${search.toString()}`;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(customHeaders as Record<string, string>)
  };

  const token = getSessionToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && body !== null && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: "include",
    body: isFormData
      ? (body as FormData)
      : body
        ? JSON.stringify(body)
        : undefined
  });

  if (res.status === 401) {
    clearSessionToken();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/callback") &&
      window.location.pathname !== "/"
    ) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "UNAUTHORIZED");
  }

  if (!res.ok) {
    let errorBody: ApiErrorResponse | undefined;
    try {
      errorBody = (await res.json()) as ApiErrorResponse;
    } catch {
      // response body wasn't JSON
    }
    throw new ApiError(
      res.status,
      errorBody?.error ?? "UNKNOWN_ERROR",
      errorBody?.details
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return request<T>(path, { method: "GET", params });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: "POST", body });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: "PATCH", body });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },

  upload<T>(path: string, formData: FormData): Promise<T> {
    return request<T>(path, { method: "POST", body: formData });
  },

  /** Build a scoped API path */
  paths: {
    auth: {
      me: `${API_BASE_PATH}/auth/me`,
      logout: `${API_BASE_PATH}/auth/logout`,
      github: `${API_URL}${API_BASE_PATH}/auth/github`
    },
    orgs: `${API_BASE_PATH}/orgs`,
    org: (orgId: string) => `${API_BASE_PATH}/orgs/${orgId}`,
    orgMembers: (orgId: string) => `${API_BASE_PATH}/orgs/${orgId}/members`,
    orgMember: (orgId: string, userId: string) =>
      `${API_BASE_PATH}/orgs/${orgId}/members/${userId}`,
    orgProjects: (orgId: string) => `${API_BASE_PATH}/orgs/${orgId}/projects`,
    orgAuditEvents: (orgId: string) =>
      `${API_BASE_PATH}/orgs/${orgId}/audit-events`,
    project: (projectId: string) => `${API_BASE_PATH}/projects/${projectId}`,
    projectSeedDemo: (projectId: string) =>
      `${API_BASE_PATH}/projects/${projectId}/seed-demo`,
    projectPrompts: (projectId: string) =>
      `${API_BASE_PATH}/projects/${projectId}/prompts`,
    projectDatasets: (projectId: string) =>
      `${API_BASE_PATH}/projects/${projectId}/datasets`,
    projectEvalConfigs: (projectId: string) =>
      `${API_BASE_PATH}/projects/${projectId}/eval-configs`,
    projectEvalRuns: (projectId: string) =>
      `${API_BASE_PATH}/projects/${projectId}/eval-runs`,
    projectRuns: (projectId: string) =>
      `${API_BASE_PATH}/projects/${projectId}/runs`,
    projectRunStats: (projectId: string) =>
      `${API_BASE_PATH}/projects/${projectId}/runs/stats`,
    projectApiKeys: (projectId: string) =>
      `${API_BASE_PATH}/projects/${projectId}/api-keys`,
    projectProviderKeys: (projectId: string) =>
      `${API_BASE_PATH}/projects/${projectId}/provider-keys`,
    prompt: (promptId: string) => `${API_BASE_PATH}/prompts/${promptId}`,
    promptVersions: (promptId: string) =>
      `${API_BASE_PATH}/prompts/${promptId}/versions`,
    promptVersion: (versionId: string) =>
      `${API_BASE_PATH}/prompt-versions/${versionId}`,
    promptVersionRelease: (versionId: string) =>
      `${API_BASE_PATH}/prompt-versions/${versionId}/release`,
    promptVersionArchive: (versionId: string) =>
      `${API_BASE_PATH}/prompt-versions/${versionId}/archive`,
    promptDiff: (promptId: string) =>
      `${API_BASE_PATH}/prompts/${promptId}/diff`,
    dataset: (datasetId: string) => `${API_BASE_PATH}/datasets/${datasetId}`,
    datasetItems: (datasetId: string) =>
      `${API_BASE_PATH}/datasets/${datasetId}/items`,
    datasetItemsBulk: (datasetId: string) =>
      `${API_BASE_PATH}/datasets/${datasetId}/items/bulk`,
    datasetItem: (itemId: string) => `${API_BASE_PATH}/dataset-items/${itemId}`,
    evalConfig: (configId: string) =>
      `${API_BASE_PATH}/eval-configs/${configId}`,
    evalRuns: `${API_BASE_PATH}/eval-runs`,
    evalRun: (runId: string) => `${API_BASE_PATH}/eval-runs/${runId}`,
    evalRunItems: (runId: string) =>
      `${API_BASE_PATH}/eval-runs/${runId}/items`,
    evalRunComplete: (runId: string) =>
      `${API_BASE_PATH}/eval-runs/${runId}/complete`,
    apiKey: (keyId: string) => `${API_BASE_PATH}/api-keys/${keyId}`,
    providerKey: (keyId: string) => `${API_BASE_PATH}/provider-keys/${keyId}`,
    runs: `${API_BASE_PATH}/runs`
  }
};
