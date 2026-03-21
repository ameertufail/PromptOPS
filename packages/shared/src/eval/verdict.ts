/**
 * Verdict calculation for eval run items.
 *
 * Priority order:
 * 1. Candidate passes checks/guardrails while base does not → IMPROVED
 * 2. Base passes checks/guardrails while candidate does not → REGRESSED
 * 3. If both are comparable, use judge-score delta
 * 4. Otherwise → SAME
 */

import type { EvalRunItemVerdict } from "../types";

export interface VerdictInput {
  baseChecksPassed: boolean;
  candidateChecksPassed: boolean;
  baseGuardrailsPassed: boolean;
  candidateGuardrailsPassed: boolean;
  baseJudgeScore?: number | null;
  candidateJudgeScore?: number | null;
  deltaThreshold: number;
}

/**
 * Calculates the verdict for a single eval item by comparing
 * base and candidate results.
 */
export function calculateVerdict(input: VerdictInput): EvalRunItemVerdict {
  const basePassed = input.baseChecksPassed && input.baseGuardrailsPassed;
  const candidatePassed =
    input.candidateChecksPassed && input.candidateGuardrailsPassed;

  // Priority 1 & 2: check/guardrail pass divergence
  if (candidatePassed && !basePassed) {
    return "IMPROVED";
  }
  if (basePassed && !candidatePassed) {
    return "REGRESSED";
  }

  // Priority 3: judge score delta
  if (input.baseJudgeScore != null && input.candidateJudgeScore != null) {
    const delta = input.candidateJudgeScore - input.baseJudgeScore;
    if (delta >= input.deltaThreshold) {
      return "IMPROVED";
    }
    if (delta <= -input.deltaThreshold) {
      return "REGRESSED";
    }
  }

  // Priority 4: default
  return "SAME";
}

/**
 * Computes the score delta between candidate and base judge scores.
 * Returns null if either score is unavailable.
 */
export function computeScoreDelta(
  baseJudgeScore?: number | null,
  candidateJudgeScore?: number | null
): number | null {
  if (baseJudgeScore == null || candidateJudgeScore == null) {
    return null;
  }
  return candidateJudgeScore - baseJudgeScore;
}
