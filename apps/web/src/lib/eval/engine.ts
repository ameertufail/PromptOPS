/**
 * Browser-side eval engine orchestrator.
 *
 * Processes dataset items with controlled concurrency, applying:
 * 1. Template rendering (base + candidate)
 * 2. LLM provider calls (BYOK)
 * 3. Deterministic checks and guardrails
 * 4. Optional LLM-as-judge scoring
 * 5. Verdict calculation
 * 6. Backend persistence of item results
 *
 * Supports retry (once after 2s), resume (skip completed items),
 * and auto-pause on 5+ consecutive errors.
 */

import type {
  CreateEvalRunItemRequest,
  DatasetItem,
  EvalItemMetrics,
  ProviderType
} from "@promptops/shared";
import {
  calculateVerdict,
  computeScoreDelta,
  renderTemplate,
  runChecks,
  runGuardrails
} from "@promptops/shared";
import { api } from "../api-client";
import { createLLMClient, scoreWithJudge } from "../llm";
import type { LLMClient } from "../llm";
import type {
  EvalEngineCallbacks,
  EvalEngineConfig,
  EvalEngineProgress,
  EvalItemProgress
} from "./types";

const DEFAULT_CONCURRENCY = 3;
const RETRY_DELAY_MS = 2000;
const MAX_CONSECUTIVE_ERRORS = 5;

export class EvalEngine {
  private readonly config: EvalEngineConfig;
  private readonly callbacks: EvalEngineCallbacks;
  private readonly llmClient: LLMClient;
  private readonly judgeClient: LLMClient | null;
  private readonly progress: EvalEngineProgress;
  private consecutiveErrors = 0;
  private aborted = false;

  constructor(config: EvalEngineConfig, callbacks: EvalEngineCallbacks) {
    this.config = config;
    this.callbacks = callbacks;

    // Determine provider from the candidate version's model config
    const modelConfig = config.candidateVersion.modelConfig;
    const provider: ProviderType =
      ((modelConfig as Record<string, unknown> | null)
        ?.provider as ProviderType) ?? "OPENAI";

    this.llmClient = createLLMClient({
      provider,
      apiKey: config.apiKey
    });

    // Set up judge client if judge is enabled
    const rules = config.evalConfig.rules;
    if (rules.judge.enabled && rules.judge.provider === "user_key") {
      this.judgeClient = this.llmClient;
    } else {
      this.judgeClient = null;
    }

    // Initialize progress
    this.progress = {
      total: config.items.length,
      completed: 0,
      errored: 0,
      processing: 0,
      items: new Map(),
      paused: false
    };

    // Mark already-completed items
    for (const item of config.items) {
      const isCompleted = config.completedItemIds?.has(item.id) ?? false;
      this.progress.items.set(item.id, {
        datasetItemId: item.id,
        status: isCompleted ? "completed" : "pending"
      });
      if (isCompleted) {
        this.progress.completed++;
      }
    }
  }

  /** Abort the current eval run */
  abort() {
    this.aborted = true;
  }

  /** Resume after a pause (resets consecutive error counter) */
  resume() {
    this.consecutiveErrors = 0;
    this.progress.paused = false;
    this.progress.pauseReason = undefined;
  }

  /** Execute the eval run, processing all pending items with controlled concurrency */
  async execute(): Promise<void> {
    const concurrency = this.config.concurrency ?? DEFAULT_CONCURRENCY;
    const pendingItems = this.config.items.filter(
      (item) => this.progress.items.get(item.id)?.status === "pending"
    );

    // Process items in batches using a semaphore-like pattern
    const queue = [...pendingItems];
    const active: Promise<void>[] = [];

    const processNext = async (): Promise<void> => {
      while (queue.length > 0 && !this.aborted && !this.progress.paused) {
        const item = queue.shift()!;
        await this.processItem(item);
      }
    };

    // Launch concurrent workers
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      active.push(processNext());
    }

    await Promise.all(active);
  }

  private async processItem(item: DatasetItem): Promise<void> {
    if (this.aborted || this.progress.paused) return;

    const itemId = item.id;
    this.updateItemStatus(itemId, "processing");

    try {
      const result = await this.processItemWithRetry(item);

      // Persist result to backend
      const persistedResult = await api.post<{
        item: unknown;
        progress: unknown;
      }>(api.paths.evalRunItems(this.config.run.id), result);

      this.updateItemStatus(itemId, "completed");
      this.progress.completed++;
      this.consecutiveErrors = 0;

      this.callbacks.onItemComplete?.(
        itemId,
        result,
        persistedResult.item as never
      );
      this.emitProgress();
    } catch (err) {
      this.handleItemError(itemId, err);
    }
  }

  private async processItemWithRetry(
    item: DatasetItem
  ): Promise<CreateEvalRunItemRequest> {
    try {
      return await this.processItemCore(item);
    } catch (firstError) {
      // Retry once after delay
      await sleep(RETRY_DELAY_MS);
      try {
        return await this.processItemCore(item);
      } catch {
        // Rethrow first error for better diagnostics
        throw firstError;
      }
    }
  }

  private async processItemCore(
    item: DatasetItem
  ): Promise<CreateEvalRunItemRequest> {
    const rules = this.config.evalConfig.rules;
    const inputVars = parseInputToVars(item.input);
    const expectedOutput =
      typeof item.expectedOutput === "string" ? item.expectedOutput : null;

    // 1. Render templates
    const basePrompt = renderTemplate(
      this.config.baseVersion.content,
      inputVars
    );
    const candidatePrompt = renderTemplate(
      this.config.candidateVersion.content,
      inputVars
    );

    // 2. Call provider for both base and candidate
    const modelConfig = this.config.candidateVersion.modelConfig;
    const model =
      ((modelConfig as Record<string, unknown> | null)?.model as string) ??
      "gpt-4o";
    const temperature = (modelConfig as Record<string, unknown> | null)
      ?.temperature as number | undefined;
    const maxTokens = (modelConfig as Record<string, unknown> | null)
      ?.maxTokens as number | undefined;

    const [baseResponse, candidateResponse] = await Promise.all([
      this.llmClient.generate({
        prompt: basePrompt,
        model,
        temperature,
        maxTokens
      }),
      this.llmClient.generate({
        prompt: candidatePrompt,
        model,
        temperature,
        maxTokens
      })
    ]);

    // 3. Run deterministic checks
    const baseChecksResult = runChecks({
      checks: rules.checks,
      output: baseResponse.output,
      expectedOutput
    });
    const candidateChecksResult = runChecks({
      checks: rules.checks,
      output: candidateResponse.output,
      expectedOutput
    });

    // 4. Run guardrails (use raw dataset input for injection check, not rendered prompt)
    const rawInputText =
      typeof item.input === "string" ? item.input : JSON.stringify(item.input);
    const baseGuardrailsResult = runGuardrails({
      piiDetection: rules.guardrails.piiDetection,
      promptInjectionCheck: rules.guardrails.promptInjectionCheck,
      output: baseResponse.output,
      input: rawInputText
    });
    const candidateGuardrailsResult = runGuardrails({
      piiDetection: rules.guardrails.piiDetection,
      promptInjectionCheck: rules.guardrails.promptInjectionCheck,
      output: candidateResponse.output,
      input: rawInputText
    });

    // 5. Optional judge scoring
    let baseJudgeScore: number | null = null;
    let candidateJudgeScore: number | null = null;
    let baseJudgeReasons: string[] = [];
    let candidateJudgeReasons: string[] = [];

    if (rules.judge.enabled && this.judgeClient) {
      const inputText =
        typeof item.input === "string"
          ? item.input
          : JSON.stringify(item.input);

      const [baseJudge, candidateJudge] = await Promise.all([
        scoreWithJudge({
          client: this.judgeClient,
          judge: rules.judge,
          input: inputText,
          output: baseResponse.output
        }),
        scoreWithJudge({
          client: this.judgeClient,
          judge: rules.judge,
          input: inputText,
          output: candidateResponse.output
        })
      ]);

      baseJudgeScore = baseJudge.score;
      candidateJudgeScore = candidateJudge.score;
      baseJudgeReasons = baseJudge.reasons;
      candidateJudgeReasons = candidateJudge.reasons;
    }

    // 6. Build metrics
    const baseMetrics: EvalItemMetrics = {
      latencyMs: baseResponse.latencyMs,
      checks: baseChecksResult.results,
      allChecksPassed: baseChecksResult.allPassed,
      guardrails: baseGuardrailsResult.results,
      guardrailFailures: baseGuardrailsResult.failures,
      failures: [
        ...Object.entries(baseChecksResult.results)
          .filter(([, r]) => !r.pass)
          .map(([name]) => `check:${name}`),
        ...baseGuardrailsResult.failures
      ],
      judgeScore: baseJudgeScore,
      judgeReasons: baseJudgeReasons
    };

    const candidateMetrics: EvalItemMetrics = {
      latencyMs: candidateResponse.latencyMs,
      checks: candidateChecksResult.results,
      allChecksPassed: candidateChecksResult.allPassed,
      guardrails: candidateGuardrailsResult.results,
      guardrailFailures: candidateGuardrailsResult.failures,
      failures: [
        ...Object.entries(candidateChecksResult.results)
          .filter(([, r]) => !r.pass)
          .map(([name]) => `check:${name}`),
        ...candidateGuardrailsResult.failures
      ],
      judgeScore: candidateJudgeScore,
      judgeReasons: candidateJudgeReasons
    };

    // 7. Calculate verdict
    const verdict = calculateVerdict({
      baseChecksPassed: baseChecksResult.allPassed,
      candidateChecksPassed: candidateChecksResult.allPassed,
      baseGuardrailsPassed: baseGuardrailsResult.failures.length === 0,
      candidateGuardrailsPassed:
        candidateGuardrailsResult.failures.length === 0,
      baseJudgeScore,
      candidateJudgeScore,
      deltaThreshold: rules.comparison.deltaThreshold
    });

    // 8. Build delta
    const scoreDelta = computeScoreDelta(baseJudgeScore, candidateJudgeScore);
    const latencyDelta = candidateResponse.latencyMs - baseResponse.latencyMs;
    const passDelta =
      candidateChecksResult.allPassed !== baseChecksResult.allPassed
        ? candidateChecksResult.allPassed
        : undefined;

    return {
      datasetItemId: item.id,
      baseOutput: baseResponse.output,
      candidateOutput: candidateResponse.output,
      baseMetrics,
      candidateMetrics,
      delta: {
        scoreDelta: scoreDelta ?? undefined,
        latencyDelta,
        passDelta
      },
      verdict
    };
  }

  private handleItemError(itemId: string, err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    this.updateItemStatus(itemId, "error", errorMessage);
    this.progress.errored++;
    this.consecutiveErrors++;

    if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      this.progress.paused = true;
      this.progress.pauseReason = `Paused after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. Last: ${errorMessage}`;
      this.callbacks.onError?.(new Error(this.progress.pauseReason));
    }

    this.emitProgress();
  }

  private updateItemStatus(
    itemId: string,
    status: EvalItemProgress["status"],
    errorMessage?: string
  ) {
    const existing = this.progress.items.get(itemId);
    if (existing) {
      existing.status = status;
      existing.errorMessage = errorMessage;
    }

    // Update processing count
    let processing = 0;
    for (const [, item] of this.progress.items) {
      if (item.status === "processing") processing++;
    }
    this.progress.processing = processing;

    this.emitProgress();
  }

  private emitProgress() {
    this.callbacks.onProgress({ ...this.progress });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseInputToVars(input: unknown): Record<string, unknown> {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Not JSON — treat as a single "input" variable
    }
    return { input };
  }

  if (typeof input === "object" && input !== null) {
    return input as Record<string, unknown>;
  }

  return { input: String(input) };
}
