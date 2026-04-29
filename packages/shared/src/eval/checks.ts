/**
 * Deterministic checks for eval output validation.
 * Each check returns a normalized CheckResult { pass, error?, details? }.
 */

import Ajv from "ajv";
import type { CheckResult, EvalChecks, JsonObject } from "../types";

/**
 * Checks whether the output is valid JSON.
 * Returns pass=true if parsing succeeds.
 */
export function checkJsonValid(output: string): CheckResult {
  if (output.length > 100_000) {
    return {
      pass: false,
      error: "Input exceeds maximum length of 100,000 characters"
    };
  }
  try {
    JSON.parse(output);
    return { pass: true };
  } catch (err) {
    return {
      pass: false,
      error: err instanceof Error ? err.message : "Invalid JSON"
    };
  }
}

/**
 * Validates output against a JSON schema using Ajv.
 * The output must be valid JSON first.
 */
export function checkJsonSchema(
  output: string,
  schema: JsonObject
): CheckResult {
  if (output.length > 100_000) {
    return {
      pass: false,
      error: "Input exceeds maximum length of 100,000 characters"
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return { pass: false, error: "Output is not valid JSON" };
  }

  const ajv = new Ajv({ allErrors: true }); // Fresh instance per call
  const validate = ajv.compile(schema);
  const valid = validate(parsed);

  if (valid) {
    return { pass: true };
  }

  return {
    pass: false,
    error: "JSON schema validation failed",
    details:
      validate.errors?.map((e) => `${e.instancePath || "/"} ${e.message}`) ?? []
  };
}

/**
 * Tests whether the output matches a given regex pattern.
 */
export function checkRegexMatch(output: string, pattern: string): CheckResult {
  if (output.length > 100_000) {
    return {
      pass: false,
      error: "Input exceeds maximum length of 100,000 characters"
    };
  }
  if (pattern.length > 500) {
    return {
      pass: false,
      error: "Regex pattern exceeds maximum length of 500 characters"
    };
  }
  // Check for dangerous nested quantifiers
  if (
    /(\+|\*|\{)\s*(\+|\*|\{)/.test(pattern) ||
    /\([^)]*(\+|\*)[^)]*\)\s*(\+|\*|\{)/.test(pattern)
  ) {
    return {
      pass: false,
      error: "Regex pattern contains potentially dangerous nested quantifiers"
    };
  }
  try {
    const regex = new RegExp(pattern);
    const match = regex.test(output);
    return {
      pass: match,
      ...(match ? {} : { error: `Output did not match pattern: ${pattern}` })
    };
  } catch (err) {
    return {
      pass: false,
      error: `Invalid regex pattern: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Checks whether the output exactly matches the expected value.
 * Comparison is case-sensitive and trimmed on both sides.
 */
export function checkExactMatch(output: string, expected: string): CheckResult {
  const pass = output.trim() === expected.trim();
  return {
    pass,
    ...(pass ? {} : { error: "Output does not match expected value" })
  };
}

export interface RunChecksInput {
  checks: EvalChecks;
  output: string;
  expectedOutput?: string | null;
}

/**
 * Runs all enabled deterministic checks against the output.
 * Returns a map of check name → CheckResult and a boolean indicating
 * whether all checks passed.
 */
export function runChecks(input: RunChecksInput): {
  results: Record<string, CheckResult>;
  allPassed: boolean;
} {
  const { checks, output, expectedOutput } = input;
  const results: Record<string, CheckResult> = {};

  if (checks.jsonValid) {
    results.jsonValid = checkJsonValid(output);
  }

  if (checks.jsonSchema) {
    results.jsonSchema = checkJsonSchema(output, checks.jsonSchema);
  }

  if (checks.regexMatch) {
    results.regexMatch = checkRegexMatch(output, checks.regexMatch);
  }

  if (checks.exactMatch && expectedOutput != null) {
    results.exactMatch = checkExactMatch(output, String(expectedOutput));
  }

  const allPassed = Object.values(results).every((r) => r.pass);
  return { results, allPassed };
}
