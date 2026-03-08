import type { z } from "zod";
import type {
  addOrgMemberRequestSchema,
  apiErrorCodeSchema,
  apiErrorResponseSchema,
  apiHealthResponseSchema,
  apiKeySchema,
  auditEventSchema,
  authGithubCallbackQuerySchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
  checkResultSchema,
  completeEvalRunRequestSchema,
  completeEvalRunResponseSchema,
  contractResponseModeSchema,
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  createDatasetItemRequestSchema,
  createDatasetRequestSchema,
  createDatasetResponseSchema,
  createEvalConfigRequestSchema,
  createEvalConfigResponseSchema,
  createEvalRunItemRequestSchema,
  createEvalRunItemResponseSchema,
  createEvalRunRequestSchema,
  createEvalRunResponseSchema,
  createOrgRequestSchema,
  createOrgResponseSchema,
  createProjectRequestSchema,
  createProjectResponseSchema,
  createPromptRequestSchema,
  createPromptResponseSchema,
  createPromptVersionRequestSchema,
  createPromptVersionResponseSchema,
  createProviderKeyRequestSchema,
  createProviderKeyResponseSchema,
  createRunLogRequestSchema,
  createRunLogResponseSchema,
  datasetDetailQuerySchema,
  datasetIdParamsSchema,
  datasetItemIdParamsSchema,
  datasetItemResponseSchema,
  datasetItemSchema,
  datasetItemsBulkImportResponseSchema,
  datasetJsonlImportLineSchema,
  datasetSchema,
  deleteDatasetItemResponseSchema,
  deleteDatasetResponseSchema,
  deleteProjectResponseSchema,
  deleteProviderKeyResponseSchema,
  diffHunkTypeSchema,
  evalChecksSchema,
  evalComparisonSchema,
  evalConfigDetailsResponseSchema,
  evalConfigIdParamsSchema,
  evalConfigSchema,
  evalGuardrailsSchema,
  evalItemMetricsSchema,
  evalJudgeSchema,
  evalRunDetailsResponseSchema,
  evalRunIdParamsSchema,
  evalRunItemSchema,
  evalRunItemVerdictSchema,
  evalRunItemsQuerySchema,
  evalRunItemsResponseSchema,
  evalRunSchema,
  evalRunStatusSchema,
  evalRunSummarySchema,
  evalRulesSchema,
  evalThresholdsSchema,
  getOrgResponseSchema,
  guardrailResultSchema,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  listApiKeysResponseSchema,
  listAuditEventsResponseSchema,
  listDatasetsResponseSchema,
  listEvalConfigsResponseSchema,
  listOrgsResponseSchema,
  listProjectEvalRunsQuerySchema,
  listProjectEvalRunsResponseSchema,
  listProjectRunsQuerySchema,
  listProjectRunsResponseSchema,
  listProjectsResponseSchema,
  listProviderKeysResponseSchema,
  listPromptsResponseSchema,
  modelConfigSchema,
  orgIdParamsSchema,
  orgMemberParamsSchema,
  orgMemberResponseSchema,
  orgMemberSummarySchema,
  orgMembershipSchema,
  orgMembershipSummarySchema,
  orgSchema,
  projectIdParamsSchema,
  projectOverviewResponseSchema,
  projectSchema,
  promptDetailsResponseSchema,
  promptDiffQuerySchema,
  promptDiffResponseSchema,
  promptListItemSchema,
  promptSchema,
  promptVersionDetailsResponseSchema,
  promptVersionIdParamsSchema,
  promptVersionSchema,
  promptVersionStateResponseSchema,
  promptVersionStatusSchema,
  providerKeySchema,
  providerTypeSchema,
  removeOrgMemberResponseSchema,
  revokeApiKeyResponseSchema,
  runMetricsSchema,
  runSchema,
  runSourceSchema,
  runStatsQuerySchema,
  runStatsResponseSchema,
  sharedContractMetadata,
  successResponseSchema,
  updateDatasetItemRequestSchema,
  updateDatasetRequestSchema,
  updateDatasetResponseSchema,
  updateEvalConfigRequestSchema,
  updateEvalConfigResponseSchema,
  updateOrgMemberRequestSchema,
  updateProjectRequestSchema,
  updateProjectResponseSchema,
  userRoleSchema,
  userSchema,
  workspaceSurfaceSchema
} from "./schemas";

export type WorkspaceSurface = z.infer<typeof workspaceSurfaceSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type PromptVersionStatus = z.infer<typeof promptVersionStatusSchema>;
export type EvalRunStatus = z.infer<typeof evalRunStatusSchema>;
export type EvalRunItemVerdict = z.infer<typeof evalRunItemVerdictSchema>;
export type RunSource = z.infer<typeof runSourceSchema>;
export type ProviderType = z.infer<typeof providerTypeSchema>;
export type DiffHunkType = z.infer<typeof diffHunkTypeSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ContractResponseMode = z.infer<typeof contractResponseModeSchema>;

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type ApiHealthResponse = z.infer<typeof apiHealthResponseSchema>;

export type User = z.infer<typeof userSchema>;
export type Org = z.infer<typeof orgSchema>;
export type OrgMembership = z.infer<typeof orgMembershipSchema>;
export type OrgMembershipSummary = z.infer<typeof orgMembershipSummarySchema>;
export type OrgMemberSummary = z.infer<typeof orgMemberSummarySchema>;
export type Project = z.infer<typeof projectSchema>;
export type Prompt = z.infer<typeof promptSchema>;
export type ModelConfig = z.infer<typeof modelConfigSchema>;
export type PromptVersion = z.infer<typeof promptVersionSchema>;
export type PromptListItem = z.infer<typeof promptListItemSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type DatasetItem = z.infer<typeof datasetItemSchema>;
export type EvalChecks = z.infer<typeof evalChecksSchema>;
export type EvalGuardrails = z.infer<typeof evalGuardrailsSchema>;
export type EvalJudge = z.infer<typeof evalJudgeSchema>;
export type EvalThresholds = z.infer<typeof evalThresholdsSchema>;
export type EvalComparison = z.infer<typeof evalComparisonSchema>;
export type EvalRules = z.infer<typeof evalRulesSchema>;
export type EvalConfig = z.infer<typeof evalConfigSchema>;
export type CheckResult = z.infer<typeof checkResultSchema>;
export type GuardrailResult = z.infer<typeof guardrailResultSchema>;
export type EvalItemMetrics = z.infer<typeof evalItemMetricsSchema>;
export type EvalRunSummary = z.infer<typeof evalRunSummarySchema>;
export type EvalRun = z.infer<typeof evalRunSchema>;
export type EvalRunItem = z.infer<typeof evalRunItemSchema>;
export type RunMetrics = z.infer<typeof runMetricsSchema>;
export type Run = z.infer<typeof runSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type ProviderKey = z.infer<typeof providerKeySchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;

export type AuthGithubCallbackQuery = z.infer<
  typeof authGithubCallbackQuerySchema
>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
export type AuthLogoutResponse = z.infer<typeof authLogoutResponseSchema>;

export type CreateOrgRequest = z.infer<typeof createOrgRequestSchema>;
export type CreateOrgResponse = z.infer<typeof createOrgResponseSchema>;
export type ListOrgsResponse = z.infer<typeof listOrgsResponseSchema>;
export type OrgIdParams = z.infer<typeof orgIdParamsSchema>;
export type GetOrgResponse = z.infer<typeof getOrgResponseSchema>;
export type AddOrgMemberRequest = z.infer<typeof addOrgMemberRequestSchema>;
export type UpdateOrgMemberRequest = z.infer<
  typeof updateOrgMemberRequestSchema
>;
export type OrgMemberParams = z.infer<typeof orgMemberParamsSchema>;
export type OrgMemberResponse = z.infer<typeof orgMemberResponseSchema>;
export type RemoveOrgMemberResponse = z.infer<
  typeof removeOrgMemberResponseSchema
>;

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type CreateProjectResponse = z.infer<typeof createProjectResponseSchema>;
export type ListProjectsResponse = z.infer<typeof listProjectsResponseSchema>;
export type ProjectIdParams = z.infer<typeof projectIdParamsSchema>;
export type ProjectOverviewResponse = z.infer<
  typeof projectOverviewResponseSchema
>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export type UpdateProjectResponse = z.infer<typeof updateProjectResponseSchema>;
export type DeleteProjectResponse = z.infer<typeof deleteProjectResponseSchema>;

export type CreatePromptRequest = z.infer<typeof createPromptRequestSchema>;
export type CreatePromptResponse = z.infer<typeof createPromptResponseSchema>;
export type ListPromptsResponse = z.infer<typeof listPromptsResponseSchema>;
export type PromptDetailsResponse = z.infer<typeof promptDetailsResponseSchema>;
export type CreatePromptVersionRequest = z.infer<
  typeof createPromptVersionRequestSchema
>;
export type CreatePromptVersionResponse = z.infer<
  typeof createPromptVersionResponseSchema
>;
export type PromptVersionIdParams = z.infer<typeof promptVersionIdParamsSchema>;
export type PromptVersionDetailsResponse = z.infer<
  typeof promptVersionDetailsResponseSchema
>;
export type PromptVersionStateResponse = z.infer<
  typeof promptVersionStateResponseSchema
>;
export type PromptDiffQuery = z.infer<typeof promptDiffQuerySchema>;
export type PromptDiffResponse = z.infer<typeof promptDiffResponseSchema>;

export type CreateDatasetRequest = z.infer<typeof createDatasetRequestSchema>;
export type CreateDatasetResponse = z.infer<typeof createDatasetResponseSchema>;
export type ListDatasetsResponse = z.infer<typeof listDatasetsResponseSchema>;
export type DatasetIdParams = z.infer<typeof datasetIdParamsSchema>;
export type DatasetDetailQuery = z.infer<typeof datasetDetailQuerySchema>;
export type DatasetItemIdParams = z.infer<typeof datasetItemIdParamsSchema>;
export type CreateDatasetItemRequest = z.infer<
  typeof createDatasetItemRequestSchema
>;
export type UpdateDatasetRequest = z.infer<typeof updateDatasetRequestSchema>;
export type UpdateDatasetResponse = z.infer<typeof updateDatasetResponseSchema>;
export type UpdateDatasetItemRequest = z.infer<
  typeof updateDatasetItemRequestSchema
>;
export type DatasetItemResponse = z.infer<typeof datasetItemResponseSchema>;
export type DeleteDatasetResponse = z.infer<typeof deleteDatasetResponseSchema>;
export type DeleteDatasetItemResponse = z.infer<
  typeof deleteDatasetItemResponseSchema
>;
export type DatasetJsonlImportLine = z.infer<
  typeof datasetJsonlImportLineSchema
>;
export type DatasetItemsBulkImportResponse = z.infer<
  typeof datasetItemsBulkImportResponseSchema
>;

export type CreateEvalConfigRequest = z.infer<
  typeof createEvalConfigRequestSchema
>;
export type CreateEvalConfigResponse = z.infer<
  typeof createEvalConfigResponseSchema
>;
export type ListEvalConfigsResponse = z.infer<
  typeof listEvalConfigsResponseSchema
>;
export type EvalConfigIdParams = z.infer<typeof evalConfigIdParamsSchema>;
export type EvalConfigDetailsResponse = z.infer<
  typeof evalConfigDetailsResponseSchema
>;
export type UpdateEvalConfigRequest = z.infer<
  typeof updateEvalConfigRequestSchema
>;
export type UpdateEvalConfigResponse = z.infer<
  typeof updateEvalConfigResponseSchema
>;
export type CreateEvalRunRequest = z.infer<typeof createEvalRunRequestSchema>;
export type CreateEvalRunResponse = z.infer<typeof createEvalRunResponseSchema>;
export type EvalRunIdParams = z.infer<typeof evalRunIdParamsSchema>;
export type EvalRunDetailsResponse = z.infer<typeof evalRunDetailsResponseSchema>;
export type EvalRunItemsQuery = z.infer<typeof evalRunItemsQuerySchema>;
export type EvalRunItemsResponse = z.infer<typeof evalRunItemsResponseSchema>;
export type CreateEvalRunItemRequest = z.infer<
  typeof createEvalRunItemRequestSchema
>;
export type CreateEvalRunItemResponse = z.infer<
  typeof createEvalRunItemResponseSchema
>;
export type CompleteEvalRunRequest = z.infer<
  typeof completeEvalRunRequestSchema
>;
export type CompleteEvalRunResponse = z.infer<
  typeof completeEvalRunResponseSchema
>;
export type ListProjectEvalRunsQuery = z.infer<
  typeof listProjectEvalRunsQuerySchema
>;
export type ListProjectEvalRunsResponse = z.infer<
  typeof listProjectEvalRunsResponseSchema
>;

export type CreateRunLogRequest = z.infer<typeof createRunLogRequestSchema>;
export type CreateRunLogResponse = z.infer<typeof createRunLogResponseSchema>;
export type LogRunRequest = CreateRunLogRequest;
export type LogRunResponse = CreateRunLogResponse;
export type ListProjectRunsQuery = z.infer<typeof listProjectRunsQuerySchema>;
export type ListProjectRunsResponse = z.infer<
  typeof listProjectRunsResponseSchema
>;
export type RunStatsQuery = z.infer<typeof runStatsQuerySchema>;
export type RunStatsResponse = z.infer<typeof runStatsResponseSchema>;

export type CreateApiKeyRequest = z.infer<typeof createApiKeyRequestSchema>;
export type CreateApiKeyResponse = z.infer<typeof createApiKeyResponseSchema>;
export type ListApiKeysResponse = z.infer<typeof listApiKeysResponseSchema>;
export type RevokeApiKeyResponse = z.infer<typeof revokeApiKeyResponseSchema>;
export type CreateProviderKeyRequest = z.infer<
  typeof createProviderKeyRequestSchema
>;
export type CreateProviderKeyResponse = z.infer<
  typeof createProviderKeyResponseSchema
>;
export type ListProviderKeysResponse = z.infer<
  typeof listProviderKeysResponseSchema
>;
export type DeleteProviderKeyResponse = z.infer<
  typeof deleteProviderKeyResponseSchema
>;
export type ListAuditEventsResponse = z.infer<
  typeof listAuditEventsResponseSchema
>;

export type SharedContractMetadata = typeof sharedContractMetadata;

export type { JsonObject, JsonPrimitive, JsonValue };
