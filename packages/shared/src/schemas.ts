import { z } from "zod";
import {
  API_AUTH_BASE_PATH,
  API_BASE_PATH,
  API_CONTRACT_METHODS,
  API_ERROR_CODES,
  API_HEALTH_PATH,
  API_RUNS_PATH,
  AUTH_CALLBACK_FRONTEND_PATH,
  AUTH_SESSION_COOKIE_NAME,
  CONTRACT_RESPONSE_MODES,
  DATASET_TYPES,
  DEFAULT_PAGE_SIZE,
  DIFF_HUNK_TYPES,
  EVAL_RUN_ITEM_VERDICTS,
  EVAL_RUN_STATUSES,
  JUDGE_PROVIDERS,
  MAX_PAGE_SIZE,
  PROMPT_VERSION_STATUSES,
  PROVIDER_TYPES,
  RUN_SOURCES,
  SDK_DEFAULT_BASE_URL,
  SHARED_CONTRACT_VERSION,
  USER_ROLES,
  WORKSPACE_SURFACES
} from "./constants";

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const API_KEY_REGEX = /^po_sk_[A-Za-z0-9]{32}$/;

type PatchObjectShape = z.ZodRawShape;

function requireAtLeastOneField<T extends PatchObjectShape>(
  schema: z.ZodObject<T>
) {
  return schema.refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    {
      message: "At least one field must be provided."
    }
  );
}

export const workspaceSurfaceSchema = z.enum(WORKSPACE_SURFACES);
export const userRoleSchema = z.enum(USER_ROLES);
export const promptVersionStatusSchema = z.enum(PROMPT_VERSION_STATUSES);
export const datasetTypeSchema = z.enum(DATASET_TYPES);
export const evalRunStatusSchema = z.enum(EVAL_RUN_STATUSES);
export const evalRunItemVerdictSchema = z.enum(EVAL_RUN_ITEM_VERDICTS);
export const runSourceSchema = z.enum(RUN_SOURCES);
export const providerTypeSchema = z.enum(PROVIDER_TYPES);
export const judgeProviderSchema = z.enum(JUDGE_PROVIDERS);
export const diffHunkTypeSchema = z.enum(DIFF_HUNK_TYPES);
export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);
export const apiContractMethodSchema = z.enum(API_CONTRACT_METHODS);
export const contractResponseModeSchema = z.enum(CONTRACT_RESPONSE_MODES);

export const nonEmptyTrimmedStringSchema = z.string().trim().min(1);
export const nameSchema = nonEmptyTrimmedStringSchema.max(120);
export const descriptionSchema = z.string().trim().max(1_000);
export const ulidSchema = z
  .string()
  .regex(ULID_REGEX, "Expected a valid ULID.");
export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(SLUG_REGEX, "Expected a lowercase hyphenated slug.");
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const parseableDateStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Expected a valid date string."
  });
export const emailSchema = z.string().trim().email().max(320);
export const urlSchema = z.string().url();
export const apiKeyPlaintextSchema = z
  .string()
  .regex(API_KEY_REGEX, "Expected a PromptOps API key.");
export const positiveIntegerSchema = z.coerce.number().int().positive();
export const paginationPageSchema = positiveIntegerSchema.default(1);
export const paginationLimitSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE);

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonObject | JsonPrimitive | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema)
  ])
);

export const jsonObjectSchema: z.ZodType<JsonObject> =
  z.record(jsonValueSchema);

export const modelConfigSchema = z
  .object({
    model: nonEmptyTrimmedStringSchema.max(128),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional()
  })
  .strict();

export const paginationSchema = z
  .object({
    limit: paginationLimitSchema,
    page: paginationPageSchema,
    total: z.number().int().nonnegative()
  })
  .strict();

export const cursorPaginationSchema = z
  .object({
    limit: paginationLimitSchema,
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative()
  })
  .strict();

export const apiErrorResponseSchema = z
  .object({
    details: jsonValueSchema.optional(),
    error: apiErrorCodeSchema,
    message: nonEmptyTrimmedStringSchema
  })
  .strict();

export const userSchema = z
  .object({
    avatarUrl: urlSchema.nullable(),
    createdAt: isoDateTimeSchema,
    email: emailSchema,
    githubId: z.number().int().positive(),
    id: ulidSchema,
    name: nameSchema
  })
  .strict();

export const orgSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    id: ulidSchema,
    name: nameSchema,
    slug: slugSchema
  })
  .strict();

export const orgMembershipSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    orgId: ulidSchema,
    role: userRoleSchema,
    userId: ulidSchema
  })
  .strict();

export const orgMembershipSummarySchema = z
  .object({
    joinedAt: isoDateTimeSchema,
    org: orgSchema,
    role: userRoleSchema
  })
  .strict();

export const orgMemberSummarySchema = z
  .object({
    joinedAt: isoDateTimeSchema,
    role: userRoleSchema,
    user: userSchema
  })
  .strict();

export const projectSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    description: z.string().nullable(),
    id: ulidSchema,
    name: nameSchema,
    orgId: ulidSchema,
    slug: slugSchema
  })
  .strict();

export const promptSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    createdBy: ulidSchema.nullable(),
    description: z.string().nullable(),
    id: ulidSchema,
    name: nameSchema,
    projectId: ulidSchema
  })
  .strict();

export const promptVersionSchema = z
  .object({
    content: nonEmptyTrimmedStringSchema,
    createdAt: isoDateTimeSchema,
    createdBy: ulidSchema.nullable(),
    id: ulidSchema,
    modelConfig: modelConfigSchema.nullable(),
    promptId: ulidSchema,
    status: promptVersionStatusSchema,
    variablesSchema: jsonObjectSchema.nullable(),
    versionNumber: z.number().int().positive()
  })
  .strict();

export const promptListItemSchema = z
  .object({
    latestVersion: promptVersionSchema.nullable(),
    prompt: promptSchema
  })
  .strict();

export const datasetSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    createdBy: ulidSchema.nullable(),
    description: z.string().nullable(),
    id: ulidSchema,
    itemCount: z.number().int().nonnegative(),
    name: nameSchema,
    projectId: ulidSchema,
    type: datasetTypeSchema
  })
  .strict();

export const datasetItemSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    datasetId: ulidSchema,
    expectedOutput: jsonValueSchema.nullable(),
    id: ulidSchema,
    input: jsonObjectSchema,
    rubric: jsonValueSchema.nullable(),
    sortOrder: z.number().int().nonnegative(),
    tags: z.array(nonEmptyTrimmedStringSchema).default([])
  })
  .strict();

export const evalChecksSchema = z
  .object({
    exactMatch: z.boolean().default(false),
    jsonSchema: jsonObjectSchema.nullable().default(null),
    jsonValid: z.boolean().default(false),
    regexMatch: z.string().min(1).nullable().default(null)
  })
  .strict();

export const evalGuardrailsSchema = z
  .object({
    piiDetection: z.boolean().default(false),
    promptInjectionCheck: z.boolean().default(false)
  })
  .strict();

export const evalJudgeSchema = z
  .object({
    enabled: z.boolean(),
    model: nonEmptyTrimmedStringSchema.max(128).optional(),
    provider: judgeProviderSchema.optional(),
    rubric: nonEmptyTrimmedStringSchema.max(4_000).optional(),
    scaleMax: z.number().int().positive().optional(),
    scaleMin: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.enabled) {
      return;
    }

    if (!value.provider) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Judge provider is required when judge scoring is enabled.",
        path: ["provider"]
      });
    }

    if (!value.model) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Judge model is required when judge scoring is enabled.",
        path: ["model"]
      });
    }

    if (!value.rubric) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Judge rubric is required when judge scoring is enabled.",
        path: ["rubric"]
      });
    }

    if (
      value.scaleMin !== undefined &&
      value.scaleMax !== undefined &&
      value.scaleMax <= value.scaleMin
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Judge scaleMax must be strictly greater than scaleMin.",
        path: ["scaleMax"]
      });
    }
  });

export const evalThresholdsSchema = z
  .object({
    allChecksPass: z.boolean().default(true),
    minJudgeScore: z.number().min(1).max(5).nullable().default(null),
    noGuardrailFailures: z.boolean().default(true)
  })
  .strict();

export const evalComparisonSchema = z
  .object({
    deltaThreshold: z.number().min(0).default(0.5),
    sampleSize: z.number().int().positive().nullable().default(null)
  })
  .strict();

export const evalRulesSchema = z
  .object({
    checks: evalChecksSchema,
    comparison: evalComparisonSchema,
    guardrails: evalGuardrailsSchema,
    judge: evalJudgeSchema,
    thresholds: evalThresholdsSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.judge.enabled && value.thresholds.minJudgeScore !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Thresholds.minJudgeScore can only be set when judge scoring is enabled.",
        path: ["thresholds", "minJudgeScore"]
      });
    }
  });

export const evalConfigSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    createdBy: ulidSchema.nullable(),
    datasetId: ulidSchema,
    id: ulidSchema,
    name: nameSchema,
    projectId: ulidSchema,
    rules: evalRulesSchema
  })
  .strict();

export const checkResultSchema = z
  .object({
    details: jsonValueSchema.optional(),
    error: z.string().optional(),
    pass: z.boolean()
  })
  .strict();

export const guardrailResultSchema = z
  .object({
    details: jsonValueSchema.optional(),
    flagged: z.boolean(),
    matches: z.array(nonEmptyTrimmedStringSchema).default([])
  })
  .strict();

export const evalItemMetricsSchema = z
  .object({
    allChecksPassed: z.boolean().optional(),
    checks: z.record(checkResultSchema).default({}),
    errorMessage: z.string().optional(),
    failures: z.array(nonEmptyTrimmedStringSchema).default([]),
    guardrailFailures: z.array(nonEmptyTrimmedStringSchema).default([]),
    guardrails: z.record(guardrailResultSchema).default({}),
    judgeReasons: z.array(nonEmptyTrimmedStringSchema).default([]),
    judgeScore: z.number().min(1).max(5).nullable().optional(),
    latencyMs: z.number().min(0).optional()
  })
  .strict();

export const evalDeltaSchema = z
  .object({
    latencyDelta: z.number().optional(),
    passDelta: z.boolean().optional(),
    scoreDelta: z.number().optional()
  })
  .strict();

export const evalRunSummarySchema = z
  .object({
    baseAvgScore: z.number().min(0).max(5).nullable(),
    basePassRate: z.number().min(0).max(1),
    candidateAvgScore: z.number().min(0).max(5).nullable(),
    candidatePassRate: z.number().min(0).max(1),
    improved: z.number().int().nonnegative(),
    regressed: z.number().int().nonnegative(),
    same: z.number().int().nonnegative(),
    topRegressions: z.array(
      z
        .object({
          datasetItemId: ulidSchema,
          inputPreview: z.string(),
          scoreDelta: z.number()
        })
        .strict()
    ),
    totalItems: z.number().int().nonnegative()
  })
  .strict();

export const evalRunSchema = z
  .object({
    baseVersionId: ulidSchema,
    candidateVersionId: ulidSchema,
    createdAt: isoDateTimeSchema,
    createdBy: ulidSchema.nullable(),
    errorMessage: z.string().nullable(),
    evalConfigId: ulidSchema,
    finishedAt: isoDateTimeSchema.nullable(),
    id: ulidSchema,
    progressCurrent: z.number().int().nonnegative(),
    progressTotal: z.number().int().nonnegative(),
    status: evalRunStatusSchema,
    summary: evalRunSummarySchema.nullable()
  })
  .strict();

export const evalRunItemSchema = z
  .object({
    baseMetrics: evalItemMetricsSchema.nullable(),
    baseOutput: z.string().nullable(),
    candidateMetrics: evalItemMetricsSchema.nullable(),
    candidateOutput: z.string().nullable(),
    createdAt: isoDateTimeSchema,
    datasetItemId: ulidSchema,
    delta: evalDeltaSchema.nullable(),
    evalRunId: ulidSchema,
    id: ulidSchema,
    verdict: evalRunItemVerdictSchema
  })
  .strict();

export const runMetricsSchema = z
  .object({
    costEstimate: z.number().min(0).optional(),
    guardrails: z.record(guardrailResultSchema).optional(),
    latencyMs: z.number().min(0).optional(),
    tokenCount: z.number().int().nonnegative().optional()
  })
  .strict();

export const runSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    id: ulidSchema,
    input: jsonObjectSchema,
    metrics: runMetricsSchema.nullable(),
    output: z.string(),
    projectId: ulidSchema,
    promptVersionId: ulidSchema.nullable(),
    source: runSourceSchema
  })
  .strict();

export const apiKeySchema = z
  .object({
    createdAt: isoDateTimeSchema,
    createdBy: ulidSchema.nullable(),
    id: ulidSchema,
    keyPrefix: z.string().trim().min(1),
    lastUsedAt: isoDateTimeSchema.nullable(),
    name: nameSchema,
    projectId: ulidSchema
  })
  .strict();

export const providerKeySchema = z
  .object({
    createdAt: isoDateTimeSchema,
    createdBy: ulidSchema.nullable(),
    id: ulidSchema,
    keyHint: z.string().trim().min(1),
    projectId: ulidSchema,
    provider: providerTypeSchema
  })
  .strict();

export const auditEventSchema = z
  .object({
    action: nonEmptyTrimmedStringSchema,
    actorUserId: ulidSchema.nullable(),
    createdAt: isoDateTimeSchema,
    entityId: ulidSchema,
    entityType: nonEmptyTrimmedStringSchema,
    id: ulidSchema,
    metadata: jsonObjectSchema.nullable(),
    orgId: ulidSchema
  })
  .strict();

export const successResponseSchema = z
  .object({
    success: z.literal(true)
  })
  .strict();

export const apiHealthResponseSchema = z
  .object({
    environment: nonEmptyTrimmedStringSchema,
    service: z.literal("promptops-api"),
    status: z.literal("ok"),
    timestamp: isoDateTimeSchema
  })
  .strict();

export const authGithubCallbackQuerySchema = z.union([
  z
    .object({
      code: nonEmptyTrimmedStringSchema,
      state: nonEmptyTrimmedStringSchema
    })
    .strict(),
  z
    .object({
      error: nonEmptyTrimmedStringSchema,
      errorDescription: z.string().optional(),
      state: z.string().optional()
    })
    .strict()
]);

export const authSessionResponseSchema = z
  .object({
    expiresAt: isoDateTimeSchema.nullable(),
    user: userSchema
  })
  .strict();

export const authLogoutResponseSchema = successResponseSchema;

export const createOrgRequestSchema = z
  .object({
    name: nameSchema,
    slug: slugSchema
  })
  .strict();

export const createOrgResponseSchema = z
  .object({
    membership: orgMembershipSchema,
    org: orgSchema
  })
  .strict();

export const listOrgsResponseSchema = z
  .object({
    orgs: z.array(orgMembershipSummarySchema)
  })
  .strict();

export const orgIdParamsSchema = z
  .object({
    orgId: ulidSchema
  })
  .strict();

export const getOrgResponseSchema = z
  .object({
    members: z.array(orgMemberSummarySchema),
    org: orgSchema
  })
  .strict();

export const addOrgMemberRequestSchema = z
  .object({
    email: emailSchema,
    role: userRoleSchema
  })
  .strict();

export const updateOrgMemberRequestSchema = z
  .object({
    role: userRoleSchema
  })
  .strict();

export const orgMemberParamsSchema = z
  .object({
    orgId: ulidSchema,
    userId: ulidSchema
  })
  .strict();

export const orgMemberResponseSchema = z
  .object({
    member: orgMemberSummarySchema
  })
  .strict();

export const removeOrgMemberResponseSchema = successResponseSchema
  .extend({
    orgId: ulidSchema,
    userId: ulidSchema
  })
  .strict();

export const createProjectRequestSchema = z
  .object({
    description: descriptionSchema.nullable().optional(),
    name: nameSchema,
    slug: slugSchema
  })
  .strict();

export const createProjectResponseSchema = z
  .object({
    project: projectSchema
  })
  .strict();

export const listProjectsResponseSchema = z
  .object({
    projects: z.array(projectSchema)
  })
  .strict();

export const projectIdParamsSchema = z
  .object({
    projectId: ulidSchema
  })
  .strict();

export const projectOverviewResponseSchema = z
  .object({
    project: projectSchema
  })
  .strict();

export const updateProjectRequestSchema = requireAtLeastOneField(
  z
    .object({
      description: descriptionSchema.nullable().optional(),
      name: nameSchema.optional()
    })
    .strict()
);

export const updateProjectResponseSchema = z
  .object({
    project: projectSchema
  })
  .strict();

export const deleteProjectResponseSchema = successResponseSchema
  .extend({
    projectId: ulidSchema
  })
  .strict();

export const createPromptRequestSchema = z
  .object({
    description: descriptionSchema.nullable().optional(),
    name: nameSchema
  })
  .strict();

export const createPromptResponseSchema = z
  .object({
    prompt: promptSchema
  })
  .strict();

export const listPromptsResponseSchema = z
  .object({
    prompts: z.array(promptListItemSchema)
  })
  .strict();

export const promptIdParamsSchema = z
  .object({
    promptId: ulidSchema
  })
  .strict();

export const promptDetailsResponseSchema = z
  .object({
    prompt: promptSchema,
    versions: z.array(promptVersionSchema)
  })
  .strict();

export const createPromptVersionRequestSchema = z
  .object({
    content: nonEmptyTrimmedStringSchema,
    modelConfig: modelConfigSchema.nullable().optional(),
    variablesSchema: jsonObjectSchema.nullable().optional()
  })
  .strict();

export const createPromptVersionResponseSchema = z
  .object({
    version: promptVersionSchema
  })
  .strict();

export const promptVersionIdParamsSchema = z
  .object({
    versionId: ulidSchema
  })
  .strict();

export const promptVersionDetailsResponseSchema = z
  .object({
    version: promptVersionSchema
  })
  .strict();

export const promptVersionStateResponseSchema = z
  .object({
    version: promptVersionSchema
  })
  .strict();

export const promptDiffQuerySchema = z
  .object({
    base: ulidSchema,
    candidate: ulidSchema
  })
  .strict();

export const promptDiffResponseSchema = z
  .object({
    baseVersionId: ulidSchema,
    candidateVersionId: ulidSchema,
    hunks: z.array(
      z
        .object({
          content: z.string(),
          type: diffHunkTypeSchema
        })
        .strict()
    ),
    promptId: ulidSchema
  })
  .strict();

export const createDatasetRequestSchema = z
  .object({
    description: descriptionSchema.nullable().optional(),
    name: nameSchema,
    type: datasetTypeSchema.default("GENERATION")
  })
  .strict();

export const createDatasetResponseSchema = z
  .object({
    dataset: datasetSchema
  })
  .strict();

export const listDatasetsResponseSchema = z
  .object({
    datasets: z.array(datasetSchema)
  })
  .strict();

export const datasetIdParamsSchema = z
  .object({
    datasetId: ulidSchema
  })
  .strict();

export const datasetDetailQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: paginationLimitSchema.optional()
  })
  .strict();

export const datasetDetailsResponseSchema = z
  .object({
    dataset: datasetSchema,
    items: z.array(datasetItemSchema),
    nextCursor: z.string().nullable()
  })
  .strict();

export const updateDatasetRequestSchema = requireAtLeastOneField(
  z
    .object({
      description: descriptionSchema.nullable().optional(),
      name: nameSchema.optional(),
      type: datasetTypeSchema.optional()
    })
    .strict()
);

export const updateDatasetResponseSchema = z
  .object({
    dataset: datasetSchema
  })
  .strict();

export const deleteDatasetResponseSchema = successResponseSchema
  .extend({
    datasetId: ulidSchema
  })
  .strict();

export const createDatasetItemRequestSchema = z
  .object({
    expectedOutput: jsonValueSchema.nullable().optional(),
    input: jsonObjectSchema,
    rubric: jsonValueSchema.nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    tags: z.array(nonEmptyTrimmedStringSchema).optional()
  })
  .strict();

export const datasetItemResponseSchema = z
  .object({
    item: datasetItemSchema
  })
  .strict();

export const datasetItemIdParamsSchema = z
  .object({
    itemId: ulidSchema
  })
  .strict();

export const updateDatasetItemRequestSchema = requireAtLeastOneField(
  z
    .object({
      expectedOutput: jsonValueSchema.nullable().optional(),
      input: jsonObjectSchema.optional(),
      rubric: jsonValueSchema.nullable().optional(),
      sortOrder: z.number().int().nonnegative().optional(),
      tags: z.array(nonEmptyTrimmedStringSchema).optional()
    })
    .strict()
);

export const deleteDatasetItemResponseSchema = successResponseSchema
  .extend({
    itemId: ulidSchema
  })
  .strict();

export const datasetJsonlImportLineSchema = z
  .object({
    expectedOutput: jsonValueSchema.nullable().optional(),
    input: jsonObjectSchema,
    rubric: jsonValueSchema.nullable().optional(),
    tags: z.array(nonEmptyTrimmedStringSchema).optional()
  })
  .strict();

export const datasetItemsBulkImportResponseSchema = z
  .object({
    errors: z.array(
      z
        .object({
          error: nonEmptyTrimmedStringSchema,
          line: z.number().int().positive()
        })
        .strict()
    ),
    failed: z.number().int().nonnegative(),
    imported: z.number().int().nonnegative()
  })
  .strict();

export const createEvalConfigRequestSchema = z
  .object({
    datasetId: ulidSchema,
    name: nameSchema,
    rules: evalRulesSchema
  })
  .strict();

export const createEvalConfigResponseSchema = z
  .object({
    config: evalConfigSchema
  })
  .strict();

export const listEvalConfigsResponseSchema = z
  .object({
    configs: z.array(evalConfigSchema)
  })
  .strict();

export const evalConfigIdParamsSchema = z
  .object({
    configId: ulidSchema
  })
  .strict();

export const evalConfigDetailsResponseSchema = z
  .object({
    config: evalConfigSchema
  })
  .strict();

export const updateEvalConfigRequestSchema = requireAtLeastOneField(
  z
    .object({
      datasetId: ulidSchema.optional(),
      name: nameSchema.optional(),
      rules: evalRulesSchema.optional()
    })
    .strict()
);

export const updateEvalConfigResponseSchema = z
  .object({
    config: evalConfigSchema
  })
  .strict();

export const createEvalRunRequestSchema = z
  .object({
    baseVersionId: ulidSchema,
    candidateVersionId: ulidSchema,
    evalConfigId: ulidSchema
  })
  .strict();

export const createEvalRunResponseSchema = z
  .object({
    baseVersion: promptVersionSchema,
    candidateVersion: promptVersionSchema,
    config: evalConfigSchema,
    dataset: datasetSchema,
    items: z.array(datasetItemSchema),
    run: evalRunSchema
  })
  .strict();

export const evalRunIdParamsSchema = z
  .object({
    runId: ulidSchema
  })
  .strict();

export const evalRunDetailsResponseSchema = z
  .object({
    run: evalRunSchema
  })
  .strict();

export const evalRunItemsQuerySchema = z
  .object({
    limit: paginationLimitSchema.optional(),
    page: paginationPageSchema.optional(),
    verdict: evalRunItemVerdictSchema.optional()
  })
  .strict();

export const evalRunItemsResponseSchema = z
  .object({
    items: z.array(evalRunItemSchema),
    limit: paginationLimitSchema,
    page: paginationPageSchema,
    total: z.number().int().nonnegative()
  })
  .strict();

export const createEvalRunItemRequestSchema = z
  .object({
    baseMetrics: evalItemMetricsSchema.nullable().optional(),
    baseOutput: z.string().nullable().optional(),
    candidateMetrics: evalItemMetricsSchema.nullable().optional(),
    candidateOutput: z.string().nullable().optional(),
    datasetItemId: ulidSchema,
    delta: evalDeltaSchema.nullable().optional(),
    verdict: evalRunItemVerdictSchema
  })
  .strict();

export const createEvalRunItemResponseSchema = z
  .object({
    item: evalRunItemSchema,
    progress: z
      .object({
        current: z.number().int().nonnegative(),
        total: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict();

export const completeEvalRunRequestSchema = z.object({}).strict();

export const completeEvalRunResponseSchema = z
  .object({
    run: evalRunSchema
  })
  .strict();

export const listProjectEvalRunsQuerySchema = z
  .object({
    limit: paginationLimitSchema.optional(),
    page: paginationPageSchema.optional(),
    status: evalRunStatusSchema.optional()
  })
  .strict();

export const listProjectEvalRunsResponseSchema = z
  .object({
    limit: paginationLimitSchema,
    page: paginationPageSchema,
    runs: z.array(evalRunSchema),
    total: z.number().int().nonnegative()
  })
  .strict();

export const createRunLogRequestSchema = z
  .object({
    input: jsonObjectSchema,
    metadata: jsonObjectSchema.optional(),
    metrics: runMetricsSchema.optional(),
    output: z.string(),
    promptVersionId: ulidSchema.optional()
  })
  .strict();

export const createRunLogResponseSchema = z
  .object({
    id: ulidSchema,
    status: z.literal("logged")
  })
  .strict();

export const listProjectRunsQuerySchema = z
  .object({
    from: parseableDateStringSchema.optional(),
    limit: paginationLimitSchema.optional(),
    page: paginationPageSchema.optional(),
    promptVersionId: ulidSchema.optional(),
    source: runSourceSchema.optional(),
    to: parseableDateStringSchema.optional()
  })
  .strict();

export const listProjectRunsResponseSchema = z
  .object({
    limit: paginationLimitSchema,
    page: paginationPageSchema,
    runs: z.array(runSchema),
    total: z.number().int().nonnegative()
  })
  .strict();

export const runStatsQuerySchema = z
  .object({
    from: parseableDateStringSchema.optional(),
    promptVersionId: ulidSchema.optional(),
    source: runSourceSchema.optional(),
    to: parseableDateStringSchema.optional()
  })
  .strict();

export const runStatsResponseSchema = z
  .object({
    averageLatencyMs: z.number().min(0).nullable(),
    averageTokenCount: z.number().min(0).nullable(),
    guardrailFailureCounts: z.record(z.number().int().nonnegative()),
    p50LatencyMs: z.number().min(0).nullable(),
    p95LatencyMs: z.number().min(0).nullable(),
    runsPerDay: z.array(
      z
        .object({
          count: z.number().int().nonnegative(),
          date: parseableDateStringSchema
        })
        .strict()
    ),
    totalCostEstimate: z.number().min(0).nullable(),
    totalRuns: z.number().int().nonnegative()
  })
  .strict();

export const createApiKeyRequestSchema = z
  .object({
    name: nameSchema
  })
  .strict();

export const createApiKeyResponseSchema = z
  .object({
    apiKey: apiKeySchema,
    plaintextKey: apiKeyPlaintextSchema
  })
  .strict();

export const listApiKeysResponseSchema = z
  .object({
    apiKeys: z.array(apiKeySchema)
  })
  .strict();

export const apiKeyIdParamsSchema = z
  .object({
    keyId: ulidSchema
  })
  .strict();

export const revokeApiKeyResponseSchema = successResponseSchema
  .extend({
    keyId: ulidSchema
  })
  .strict();

export const createProviderKeyRequestSchema = z
  .object({
    key: nonEmptyTrimmedStringSchema,
    provider: providerTypeSchema
  })
  .strict();

export const createProviderKeyResponseSchema = z
  .object({
    providerKey: providerKeySchema
  })
  .strict();

export const listProviderKeysResponseSchema = z
  .object({
    providerKeys: z.array(providerKeySchema)
  })
  .strict();

export const deleteProviderKeyResponseSchema = successResponseSchema
  .extend({
    keyId: ulidSchema
  })
  .strict();

export const auditEventsQuerySchema = z
  .object({
    limit: paginationLimitSchema.optional(),
    page: paginationPageSchema.optional()
  })
  .strict();

export const listAuditEventsResponseSchema = z
  .object({
    events: z.array(auditEventSchema),
    limit: paginationLimitSchema,
    page: paginationPageSchema,
    total: z.number().int().nonnegative()
  })
  .strict();

export const apiContractCatalog = {
  addOrgMember: {
    method: "POST",
    path: `${API_BASE_PATH}/orgs/:orgId/members`,
    request: {
      body: addOrgMemberRequestSchema,
      bodyKind: "json",
      params: orgIdParamsSchema
    },
    response: orgMemberResponseSchema,
    responseMode: "json"
  },
  archivePromptVersion: {
    method: "PATCH",
    path: `${API_BASE_PATH}/prompt-versions/:versionId/archive`,
    request: {
      params: promptVersionIdParamsSchema
    },
    response: promptVersionStateResponseSchema,
    responseMode: "json"
  },
  authGithub: {
    method: "GET",
    path: `${API_AUTH_BASE_PATH}/github`,
    responseMode: "redirect"
  },
  authGithubCallback: {
    method: "GET",
    path: `${API_AUTH_BASE_PATH}/callback`,
    request: {
      query: authGithubCallbackQuerySchema
    },
    responseMode: "redirect"
  },
  authLogout: {
    method: "POST",
    path: `${API_AUTH_BASE_PATH}/logout`,
    response: authLogoutResponseSchema,
    responseMode: "json"
  },
  authMe: {
    method: "GET",
    path: `${API_AUTH_BASE_PATH}/me`,
    response: authSessionResponseSchema,
    responseMode: "json"
  },
  completeEvalRun: {
    method: "PATCH",
    path: `${API_BASE_PATH}/eval-runs/:runId/complete`,
    request: {
      body: completeEvalRunRequestSchema,
      bodyKind: "json",
      params: evalRunIdParamsSchema
    },
    response: completeEvalRunResponseSchema,
    responseMode: "json"
  },
  createApiKey: {
    method: "POST",
    path: `${API_BASE_PATH}/projects/:projectId/api-keys`,
    request: {
      body: createApiKeyRequestSchema,
      bodyKind: "json",
      params: projectIdParamsSchema
    },
    response: createApiKeyResponseSchema,
    responseMode: "json"
  },
  createDataset: {
    method: "POST",
    path: `${API_BASE_PATH}/projects/:projectId/datasets`,
    request: {
      body: createDatasetRequestSchema,
      bodyKind: "json",
      params: projectIdParamsSchema
    },
    response: createDatasetResponseSchema,
    responseMode: "json"
  },
  createDatasetItem: {
    method: "POST",
    path: `${API_BASE_PATH}/datasets/:datasetId/items`,
    request: {
      body: createDatasetItemRequestSchema,
      bodyKind: "json",
      params: datasetIdParamsSchema
    },
    response: datasetItemResponseSchema,
    responseMode: "json"
  },
  createEvalConfig: {
    method: "POST",
    path: `${API_BASE_PATH}/projects/:projectId/eval-configs`,
    request: {
      body: createEvalConfigRequestSchema,
      bodyKind: "json",
      params: projectIdParamsSchema
    },
    response: createEvalConfigResponseSchema,
    responseMode: "json"
  },
  createEvalRun: {
    method: "POST",
    path: `${API_BASE_PATH}/eval-runs`,
    request: {
      body: createEvalRunRequestSchema,
      bodyKind: "json"
    },
    response: createEvalRunResponseSchema,
    responseMode: "json"
  },
  createEvalRunItem: {
    method: "POST",
    path: `${API_BASE_PATH}/eval-runs/:runId/items`,
    request: {
      body: createEvalRunItemRequestSchema,
      bodyKind: "json",
      params: evalRunIdParamsSchema
    },
    response: createEvalRunItemResponseSchema,
    responseMode: "json"
  },
  createOrg: {
    method: "POST",
    path: `${API_BASE_PATH}/orgs`,
    request: {
      body: createOrgRequestSchema,
      bodyKind: "json"
    },
    response: createOrgResponseSchema,
    responseMode: "json"
  },
  createProject: {
    method: "POST",
    path: `${API_BASE_PATH}/orgs/:orgId/projects`,
    request: {
      body: createProjectRequestSchema,
      bodyKind: "json",
      params: orgIdParamsSchema
    },
    response: createProjectResponseSchema,
    responseMode: "json"
  },
  createPrompt: {
    method: "POST",
    path: `${API_BASE_PATH}/projects/:projectId/prompts`,
    request: {
      body: createPromptRequestSchema,
      bodyKind: "json",
      params: projectIdParamsSchema
    },
    response: createPromptResponseSchema,
    responseMode: "json"
  },
  createPromptVersion: {
    method: "POST",
    path: `${API_BASE_PATH}/prompts/:promptId/versions`,
    request: {
      body: createPromptVersionRequestSchema,
      bodyKind: "json",
      params: promptIdParamsSchema
    },
    response: createPromptVersionResponseSchema,
    responseMode: "json"
  },
  createProviderKey: {
    method: "POST",
    path: `${API_BASE_PATH}/projects/:projectId/provider-keys`,
    request: {
      body: createProviderKeyRequestSchema,
      bodyKind: "json",
      params: projectIdParamsSchema
    },
    response: createProviderKeyResponseSchema,
    responseMode: "json"
  },
  deleteDataset: {
    method: "DELETE",
    path: `${API_BASE_PATH}/datasets/:datasetId`,
    request: {
      params: datasetIdParamsSchema
    },
    response: deleteDatasetResponseSchema,
    responseMode: "json"
  },
  deleteDatasetItem: {
    method: "DELETE",
    path: `${API_BASE_PATH}/dataset-items/:itemId`,
    request: {
      params: datasetItemIdParamsSchema
    },
    response: deleteDatasetItemResponseSchema,
    responseMode: "json"
  },
  deleteProject: {
    method: "DELETE",
    path: `${API_BASE_PATH}/projects/:projectId`,
    request: {
      params: projectIdParamsSchema
    },
    response: deleteProjectResponseSchema,
    responseMode: "json"
  },
  deleteProviderKey: {
    method: "DELETE",
    path: `${API_BASE_PATH}/provider-keys/:keyId`,
    request: {
      params: apiKeyIdParamsSchema
    },
    response: deleteProviderKeyResponseSchema,
    responseMode: "json"
  },
  getDataset: {
    method: "GET",
    path: `${API_BASE_PATH}/datasets/:datasetId`,
    request: {
      params: datasetIdParamsSchema,
      query: datasetDetailQuerySchema
    },
    response: datasetDetailsResponseSchema,
    responseMode: "json"
  },
  getEvalConfig: {
    method: "GET",
    path: `${API_BASE_PATH}/eval-configs/:configId`,
    request: {
      params: evalConfigIdParamsSchema
    },
    response: evalConfigDetailsResponseSchema,
    responseMode: "json"
  },
  getEvalRun: {
    method: "GET",
    path: `${API_BASE_PATH}/eval-runs/:runId`,
    request: {
      params: evalRunIdParamsSchema
    },
    response: evalRunDetailsResponseSchema,
    responseMode: "json"
  },
  getEvalRunItems: {
    method: "GET",
    path: `${API_BASE_PATH}/eval-runs/:runId/items`,
    request: {
      params: evalRunIdParamsSchema,
      query: evalRunItemsQuerySchema
    },
    response: evalRunItemsResponseSchema,
    responseMode: "json"
  },
  getHealth: {
    method: "GET",
    path: API_HEALTH_PATH,
    response: apiHealthResponseSchema,
    responseMode: "json"
  },
  getOrg: {
    method: "GET",
    path: `${API_BASE_PATH}/orgs/:orgId`,
    request: {
      params: orgIdParamsSchema
    },
    response: getOrgResponseSchema,
    responseMode: "json"
  },
  getPrompt: {
    method: "GET",
    path: `${API_BASE_PATH}/prompts/:promptId`,
    request: {
      params: promptIdParamsSchema
    },
    response: promptDetailsResponseSchema,
    responseMode: "json"
  },
  getPromptDiff: {
    method: "GET",
    path: `${API_BASE_PATH}/prompts/:promptId/diff`,
    request: {
      params: promptIdParamsSchema,
      query: promptDiffQuerySchema
    },
    response: promptDiffResponseSchema,
    responseMode: "json"
  },
  getPromptVersion: {
    method: "GET",
    path: `${API_BASE_PATH}/prompt-versions/:versionId`,
    request: {
      params: promptVersionIdParamsSchema
    },
    response: promptVersionDetailsResponseSchema,
    responseMode: "json"
  },
  listApiKeys: {
    method: "GET",
    path: `${API_BASE_PATH}/projects/:projectId/api-keys`,
    request: {
      params: projectIdParamsSchema
    },
    response: listApiKeysResponseSchema,
    responseMode: "json"
  },
  listAuditEvents: {
    method: "GET",
    path: `${API_BASE_PATH}/orgs/:orgId/audit-events`,
    request: {
      params: orgIdParamsSchema,
      query: auditEventsQuerySchema
    },
    response: listAuditEventsResponseSchema,
    responseMode: "json"
  },
  listDatasets: {
    method: "GET",
    path: `${API_BASE_PATH}/projects/:projectId/datasets`,
    request: {
      params: projectIdParamsSchema
    },
    response: listDatasetsResponseSchema,
    responseMode: "json"
  },
  listEvalConfigs: {
    method: "GET",
    path: `${API_BASE_PATH}/projects/:projectId/eval-configs`,
    request: {
      params: projectIdParamsSchema
    },
    response: listEvalConfigsResponseSchema,
    responseMode: "json"
  },
  listOrgProjects: {
    method: "GET",
    path: `${API_BASE_PATH}/orgs/:orgId/projects`,
    request: {
      params: orgIdParamsSchema
    },
    response: listProjectsResponseSchema,
    responseMode: "json"
  },
  listOrgs: {
    method: "GET",
    path: `${API_BASE_PATH}/orgs`,
    response: listOrgsResponseSchema,
    responseMode: "json"
  },
  listProjectEvalRuns: {
    method: "GET",
    path: `${API_BASE_PATH}/projects/:projectId/eval-runs`,
    request: {
      params: projectIdParamsSchema,
      query: listProjectEvalRunsQuerySchema
    },
    response: listProjectEvalRunsResponseSchema,
    responseMode: "json"
  },
  listProjectRuns: {
    method: "GET",
    path: `${API_BASE_PATH}/projects/:projectId/runs`,
    request: {
      params: projectIdParamsSchema,
      query: listProjectRunsQuerySchema
    },
    response: listProjectRunsResponseSchema,
    responseMode: "json"
  },
  listProjectRunStats: {
    method: "GET",
    path: `${API_BASE_PATH}/projects/:projectId/runs/stats`,
    request: {
      params: projectIdParamsSchema,
      query: runStatsQuerySchema
    },
    response: runStatsResponseSchema,
    responseMode: "json"
  },
  listProjectPrompts: {
    method: "GET",
    path: `${API_BASE_PATH}/projects/:projectId/prompts`,
    request: {
      params: projectIdParamsSchema
    },
    response: listPromptsResponseSchema,
    responseMode: "json"
  },
  listProviderKeys: {
    method: "GET",
    path: `${API_BASE_PATH}/projects/:projectId/provider-keys`,
    request: {
      params: projectIdParamsSchema
    },
    response: listProviderKeysResponseSchema,
    responseMode: "json"
  },
  logRun: {
    method: "POST",
    path: API_RUNS_PATH,
    request: {
      body: createRunLogRequestSchema,
      bodyKind: "json"
    },
    response: createRunLogResponseSchema,
    responseMode: "json"
  },
  removeOrgMember: {
    method: "DELETE",
    path: `${API_BASE_PATH}/orgs/:orgId/members/:userId`,
    request: {
      params: orgMemberParamsSchema
    },
    response: removeOrgMemberResponseSchema,
    responseMode: "json"
  },
  releasePromptVersion: {
    method: "PATCH",
    path: `${API_BASE_PATH}/prompt-versions/:versionId/release`,
    request: {
      params: promptVersionIdParamsSchema
    },
    response: promptVersionStateResponseSchema,
    responseMode: "json"
  },
  revokeApiKey: {
    method: "DELETE",
    path: `${API_BASE_PATH}/api-keys/:keyId`,
    request: {
      params: apiKeyIdParamsSchema
    },
    response: revokeApiKeyResponseSchema,
    responseMode: "json"
  },
  updateDataset: {
    method: "PATCH",
    path: `${API_BASE_PATH}/datasets/:datasetId`,
    request: {
      body: updateDatasetRequestSchema,
      bodyKind: "json",
      params: datasetIdParamsSchema
    },
    response: updateDatasetResponseSchema,
    responseMode: "json"
  },
  updateDatasetItem: {
    method: "PATCH",
    path: `${API_BASE_PATH}/dataset-items/:itemId`,
    request: {
      body: updateDatasetItemRequestSchema,
      bodyKind: "json",
      params: datasetItemIdParamsSchema
    },
    response: datasetItemResponseSchema,
    responseMode: "json"
  },
  updateEvalConfig: {
    method: "PATCH",
    path: `${API_BASE_PATH}/eval-configs/:configId`,
    request: {
      body: updateEvalConfigRequestSchema,
      bodyKind: "json",
      params: evalConfigIdParamsSchema
    },
    response: updateEvalConfigResponseSchema,
    responseMode: "json"
  },
  updateOrgMember: {
    method: "PATCH",
    path: `${API_BASE_PATH}/orgs/:orgId/members/:userId`,
    request: {
      body: updateOrgMemberRequestSchema,
      bodyKind: "json",
      params: orgMemberParamsSchema
    },
    response: orgMemberResponseSchema,
    responseMode: "json"
  },
  updateProject: {
    method: "PATCH",
    path: `${API_BASE_PATH}/projects/:projectId`,
    request: {
      body: updateProjectRequestSchema,
      bodyKind: "json",
      params: projectIdParamsSchema
    },
    response: updateProjectResponseSchema,
    responseMode: "json"
  },
  uploadDatasetItemsJsonl: {
    method: "POST",
    path: `${API_BASE_PATH}/datasets/:datasetId/items/bulk`,
    request: {
      bodyKind: "multipart",
      params: datasetIdParamsSchema
    },
    response: datasetItemsBulkImportResponseSchema,
    responseMode: "json"
  }
} as const;

export const sharedContractMetadata = {
  apiBasePath: API_BASE_PATH,
  authCallbackFrontendPath: AUTH_CALLBACK_FRONTEND_PATH,
  authSessionCookieName: AUTH_SESSION_COOKIE_NAME,
  sdkDefaultBaseUrl: SDK_DEFAULT_BASE_URL,
  version: SHARED_CONTRACT_VERSION
} as const;
