/**
 * Types for the browser-side eval engine orchestrator.
 */

import type {
  CreateEvalRunItemRequest,
  DatasetItem,
  EvalConfig,
  EvalRules,
  EvalRun,
  EvalRunItem,
  PromptVersion
} from "@promptops/shared";

export interface EvalEngineConfig {
  /** The eval run record from the backend */
  run: EvalRun;
  /** The eval configuration with rules */
  evalConfig: EvalConfig;
  /** The base prompt version */
  baseVersion: PromptVersion;
  /** The candidate prompt version */
  candidateVersion: PromptVersion;
  /** All dataset items to process */
  items: DatasetItem[];
  /** Already-completed item IDs (for resume support) */
  completedItemIds?: Set<string>;
  /** User's LLM API key (BYOK) */
  apiKey: string;
  /** Maximum concurrent item processing (default: 3) */
  concurrency?: number;
}

export type EvalItemStatus = "pending" | "processing" | "completed" | "error";

export interface EvalItemProgress {
  /** The dataset item ID */
  datasetItemId: string;
  /** Current processing status */
  status: EvalItemStatus;
  /** Error message if status is "error" */
  errorMessage?: string;
}

export interface EvalEngineProgress {
  /** Total number of items in the eval run */
  total: number;
  /** Number of items completed so far */
  completed: number;
  /** Number of items that errored */
  errored: number;
  /** Number of items currently processing */
  processing: number;
  /** Per-item status details */
  items: Map<string, EvalItemProgress>;
  /** Whether the engine is paused due to consecutive errors */
  paused: boolean;
  /** Pause reason if paused */
  pauseReason?: string;
}

export type ProgressCallback = (progress: EvalEngineProgress) => void;

export type ItemResultCallback = (
  datasetItemId: string,
  request: CreateEvalRunItemRequest,
  result: EvalRunItem
) => void;

export interface EvalEngineCallbacks {
  /** Called whenever overall progress changes */
  onProgress: ProgressCallback;
  /** Called after each item result is persisted to the backend */
  onItemComplete?: ItemResultCallback;
  /** Called when the engine encounters a fatal error or is paused */
  onError?: (error: Error) => void;
}
