/**
 * LLM-as-judge scoring helper.
 * Uses the user's BYOK key to call an LLM that scores outputs against a rubric.
 */

import type { EvalJudge } from "@promptops/shared";
import type { LLMClient } from "./types";

export interface JudgeScoreResult {
  /** The judge's score (within scaleMin–scaleMax) */
  score: number;
  /** Reasons the judge gave for the score */
  reasons: string[];
}

const DEFAULT_SCALE_MIN = 1;
const DEFAULT_SCALE_MAX = 5;

function buildJudgePrompt(opts: {
  rubric: string;
  input: string;
  output: string;
  scaleMin: number;
  scaleMax: number;
}): string {
  return `You are an expert evaluator. Score the following output based on the rubric.

## Rubric
${opts.rubric}

## Input
${opts.input}

## Output to Evaluate
${opts.output}

## Instructions
1. Evaluate the output against the rubric criteria.
2. Provide a score between ${opts.scaleMin} and ${opts.scaleMax} (inclusive).
3. Respond in this exact JSON format (no other text):

{"score": <number>, "reasons": ["<reason1>", "<reason2>"]}`;
}

function parseJudgeResponse(
  text: string,
  scaleMin: number,
  scaleMax: number
): JudgeScoreResult {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*"score"[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Judge response did not contain valid JSON with a score.");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    score?: unknown;
    reasons?: unknown;
  };

  const score = Number(parsed.score);
  if (!Number.isFinite(score) || score < scaleMin || score > scaleMax) {
    throw new Error(
      `Judge score ${score} is outside the valid range [${scaleMin}, ${scaleMax}].`
    );
  }

  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((r): r is string => typeof r === "string")
    : [];

  return { score, reasons };
}

/**
 * Calls the LLM judge to score a single output against the rubric.
 */
export async function scoreWithJudge(opts: {
  client: LLMClient;
  judge: EvalJudge;
  input: string;
  output: string;
}): Promise<JudgeScoreResult> {
  const { client, judge, input, output } = opts;

  if (!judge.rubric) {
    throw new Error("Judge rubric is required for scoring.");
  }

  const scaleMin = judge.scaleMin ?? DEFAULT_SCALE_MIN;
  const scaleMax = judge.scaleMax ?? DEFAULT_SCALE_MAX;

  const prompt = buildJudgePrompt({
    rubric: judge.rubric,
    input,
    output,
    scaleMin,
    scaleMax
  });

  const response = await client.generate({
    prompt,
    model: judge.model ?? "gpt-4o",
    temperature: judge.temperature ?? 0,
    maxTokens: 512
  });

  return parseJudgeResponse(response.output, scaleMin, scaleMax);
}
