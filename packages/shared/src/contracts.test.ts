import { describe, expect, it } from "vitest";
import {
  API_HEALTH_PATH,
  SDK_DEFAULT_BASE_URL,
  SHARED_CONTRACT_VERSION,
  apiContractCatalog,
  createRunLogRequestSchema,
  evalRulesSchema,
  promptVersionStateResponseSchema,
  sharedContractMetadata
} from "./contracts";

describe("shared contracts", () => {
  it("keeps the API health path stable", () => {
    expect(API_HEALTH_PATH).toBe("/api/health");
  });

  it("uses the local worker URL as the SDK default base URL", () => {
    expect(SDK_DEFAULT_BASE_URL).toBe("http://localhost:8787");
  });

  it("tracks the shared contract version in the public metadata", () => {
    expect(sharedContractMetadata.version).toBe(SHARED_CONTRACT_VERSION);
    expect(sharedContractMetadata).toMatchObject({
      apiBasePath: "/api",
      authCallbackFrontendPath: "/callback",
      authSessionCookieName: "po_session"
    });
  });

  it("keeps the API contract catalog stable", () => {
    const summary = Object.entries(apiContractCatalog).map(
      ([id, contract]) =>
        `${id}:${contract.method} ${contract.path} (${contract.responseMode})`
    );

    expect(summary).toMatchInlineSnapshot(`
      [
        "addOrgMember:POST /api/orgs/:orgId/members (json)",
        "archivePromptVersion:PATCH /api/prompt-versions/:versionId/archive (json)",
        "authGithub:GET /api/auth/github (redirect)",
        "authGithubCallback:GET /api/auth/callback (redirect)",
        "authLogout:POST /api/auth/logout (json)",
        "authMe:GET /api/auth/me (json)",
        "completeEvalRun:PATCH /api/eval-runs/:runId/complete (json)",
        "createApiKey:POST /api/projects/:projectId/api-keys (json)",
        "createDataset:POST /api/projects/:projectId/datasets (json)",
        "createDatasetItem:POST /api/datasets/:datasetId/items (json)",
        "createEvalConfig:POST /api/projects/:projectId/eval-configs (json)",
        "createEvalRun:POST /api/eval-runs (json)",
        "createEvalRunItem:POST /api/eval-runs/:runId/items (json)",
        "createOrg:POST /api/orgs (json)",
        "createProject:POST /api/orgs/:orgId/projects (json)",
        "createPrompt:POST /api/projects/:projectId/prompts (json)",
        "createPromptVersion:POST /api/prompts/:promptId/versions (json)",
        "createProviderKey:POST /api/projects/:projectId/provider-keys (json)",
        "deleteDataset:DELETE /api/datasets/:datasetId (json)",
        "deleteDatasetItem:DELETE /api/dataset-items/:itemId (json)",
        "deleteProject:DELETE /api/projects/:projectId (json)",
        "deleteProviderKey:DELETE /api/provider-keys/:keyId (json)",
        "getDataset:GET /api/datasets/:datasetId (json)",
        "getEvalConfig:GET /api/eval-configs/:configId (json)",
        "getEvalRun:GET /api/eval-runs/:runId (json)",
        "getEvalRunItems:GET /api/eval-runs/:runId/items (json)",
        "getHealth:GET /api/health (json)",
        "getOrg:GET /api/orgs/:orgId (json)",
        "getPrompt:GET /api/prompts/:promptId (json)",
        "getPromptDiff:GET /api/prompts/:promptId/diff (json)",
        "getPromptVersion:GET /api/prompt-versions/:versionId (json)",
        "listApiKeys:GET /api/projects/:projectId/api-keys (json)",
        "listAuditEvents:GET /api/orgs/:orgId/audit-events (json)",
        "listDatasets:GET /api/projects/:projectId/datasets (json)",
        "listEvalConfigs:GET /api/projects/:projectId/eval-configs (json)",
        "listOrgProjects:GET /api/orgs/:orgId/projects (json)",
        "listOrgs:GET /api/orgs (json)",
        "listProjectEvalRuns:GET /api/projects/:projectId/eval-runs (json)",
        "listProjectRuns:GET /api/projects/:projectId/runs (json)",
        "listProjectRunStats:GET /api/projects/:projectId/runs/stats (json)",
        "listProjectPrompts:GET /api/projects/:projectId/prompts (json)",
        "listProviderKeys:GET /api/projects/:projectId/provider-keys (json)",
        "logRun:POST /api/runs (json)",
        "releasePromptVersion:PATCH /api/prompt-versions/:versionId/release (json)",
        "revokeApiKey:DELETE /api/api-keys/:keyId (json)",
        "updateDataset:PATCH /api/datasets/:datasetId (json)",
        "updateDatasetItem:PATCH /api/dataset-items/:itemId (json)",
        "updateEvalConfig:PATCH /api/eval-configs/:configId (json)",
        "updateOrgMember:PATCH /api/orgs/:orgId/members/:userId (json)",
        "updateProject:PATCH /api/projects/:projectId (json)",
        "uploadDatasetItemsJsonl:POST /api/datasets/:datasetId/items/bulk (json)",
      ]
    `);
  });

  it("validates the SDK run logging contract", () => {
    const payload = createRunLogRequestSchema.parse({
      input: { customerId: "cus_123" },
      metadata: { environment: "test" },
      metrics: {
        costEstimate: 0.12,
        latencyMs: 240,
        tokenCount: 100
      },
      output: "ready"
    });

    expect(payload.metrics?.latencyMs).toBe(240);
  });

  it("rejects judge thresholds when judge scoring is disabled", () => {
    const result = evalRulesSchema.safeParse({
      checks: {
        exactMatch: false,
        jsonSchema: null,
        jsonValid: true,
        regexMatch: null
      },
      comparison: {
        deltaThreshold: 0.5,
        sampleSize: null
      },
      guardrails: {
        piiDetection: true,
        promptInjectionCheck: true
      },
      judge: {
        enabled: false
      },
      thresholds: {
        allChecksPass: true,
        minJudgeScore: 4,
        noGuardrailFailures: true
      }
    });

    expect(result.success).toBe(false);
  });

  it("keeps prompt version state responses aligned to canonical enums", () => {
    const response = promptVersionStateResponseSchema.parse({
      version: {
        content: "Hello {{name}}",
        createdAt: "2026-03-08T10:00:00.000Z",
        createdBy: null,
        id: "01HNZ7N9QMSB2K7Q4SM9S8P1GF",
        modelConfig: null,
        promptId: "01HNZ7N9QMSB2K7Q4SM9S8P1GG",
        status: "RELEASED",
        variablesSchema: {
          properties: {
            name: { type: "string" }
          },
          type: "object"
        },
        versionNumber: 2
      }
    });

    expect(response.version.status).toBe("RELEASED");
  });
});
