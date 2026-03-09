import { ValidationError, formatValidationIssues } from "./errors";

type SafeParseSuccess<T> = {
  data: T;
  success: true;
};

type SafeParseFailure = {
  error: {
    issues: Array<{
      code?: string;
      message?: string;
      path?: unknown;
    }>;
  };
  success: false;
};

type SafeParseSchema<T> = {
  safeParse: (value: unknown) => SafeParseFailure | SafeParseSuccess<T>;
};

export function parseWithSchema<T>(
  schema: SafeParseSchema<T>,
  value: unknown,
  message = "Request validation failed."
) {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new ValidationError(message, {
      details: {
        issues: formatValidationIssues(result.error.issues)
      }
    });
  }

  return result.data;
}
