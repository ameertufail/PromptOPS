/**
 * Eval run summary computation service.
 *
 * Computes aggregate statistics from all eval run items:
 * - totalItems, basePassRate, candidatePassRate
 * - baseAvgScore, candidateAvgScore
 * - improved/regressed/same counts
 * - topRegressions sorted by score delta
 */

import type { EvalItemMetrics, EvalRunSummary } from "@promptops/shared";
import type { DbEvalRunItem } from "../db/eval-run-queries";

export function computeEvalRunSummary(items: DbEvalRunItem[]): EvalRunSummary {
  const totalItems = items.length;
  let improved = 0;
  let regressed = 0;
  let same = 0;

  let basePassed = 0;
  let candidatePassed = 0;
  let baseScoreSum = 0;
  let baseScoreCount = 0;
  let candidateScoreSum = 0;
  let candidateScoreCount = 0;

  const regressions: Array<{
    datasetItemId: string;
    inputPreview: string;
    scoreDelta: number;
  }> = [];

  for (const item of items) {
    switch (item.verdict) {
      case "IMPROVED":
        improved++;
        break;
      case "REGRESSED":
        regressed++;
        break;
      case "SAME":
        same++;
        break;
      default:
        same++;
    }

    const baseMetrics = parseMetrics(item.base_metrics);
    const candidateMetrics = parseMetrics(item.candidate_metrics);

    if (baseMetrics?.allChecksPassed) basePassed++;
    if (candidateMetrics?.allChecksPassed) candidatePassed++;

    if (baseMetrics?.judgeScore != null) {
      baseScoreSum += baseMetrics.judgeScore;
      baseScoreCount++;
    }
    if (candidateMetrics?.judgeScore != null) {
      candidateScoreSum += candidateMetrics.judgeScore;
      candidateScoreCount++;
    }

    // Track regressions for topRegressions list
    if (item.verdict === "REGRESSED") {
      const delta = parseDelta(item.delta);
      regressions.push({
        datasetItemId: item.dataset_item_id,
        inputPreview: item.base_output?.slice(0, 100) ?? "",
        scoreDelta: delta?.scoreDelta ?? 0
      });
    }
  }

  // Sort regressions by absolute score delta descending
  regressions.sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta));

  return {
    totalItems,
    basePassRate: totalItems > 0 ? basePassed / totalItems : 0,
    candidatePassRate: totalItems > 0 ? candidatePassed / totalItems : 0,
    baseAvgScore: baseScoreCount > 0 ? baseScoreSum / baseScoreCount : null,
    candidateAvgScore:
      candidateScoreCount > 0 ? candidateScoreSum / candidateScoreCount : null,
    improved,
    regressed,
    same,
    topRegressions: regressions.slice(0, 10)
  };
}

function parseMetrics(raw: string | null): EvalItemMetrics | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EvalItemMetrics;
  } catch {
    return null;
  }
}

function parseDelta(
  raw: string | null
): { scoreDelta?: number; latencyDelta?: number; passDelta?: boolean } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      scoreDelta?: number;
      latencyDelta?: number;
      passDelta?: boolean;
    };
  } catch {
    return null;
  }
}
