import type {
  ApiErrorCode,
  ApiErrorResponse,
  JsonValue
} from "@promptops/shared";

type ValidationIssue = {
  code?: string;
  message?: string;
  path?: unknown;
};

export type AppErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500;

type AppErrorOptions = {
  cause?: unknown;
  details?: JsonValue;
  headers?: Record<string, string>;
};

function mergeRequestId(
  details: JsonValue | undefined,
  requestId: string | undefined
): JsonValue | undefined {
  if (!requestId) {
    return details;
  }

  if (details === undefined) {
    return { requestId };
  }

  if (
    details === null ||
    Array.isArray(details) ||
    typeof details !== "object"
  ) {
    return {
      context: details,
      requestId
    };
  }

  return {
    ...details,
    requestId
  };
}

export function formatValidationIssues(issues: ValidationIssue[]) {
  return issues.map((issue) => ({
    code: issue.code ?? "custom",
    message: issue.message ?? "Invalid value.",
    path: Array.isArray(issue.path) ? issue.path.map(String) : []
  }));
}

function hasValidationIssues(
  error: unknown
): error is { issues: ValidationIssue[] } {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}

export class AppError extends Error {
  code: ApiErrorCode;
  details?: JsonValue;
  headers: Record<string, string>;
  status: AppErrorStatus;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: AppErrorStatus,
    options: AppErrorOptions = {}
  ) {
    super(message, { cause: options.cause });

    this.code = code;
    this.details = options.details;
    this.headers = options.headers ?? {};
    this.name = new.target.name;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("VALIDATION_ERROR", message, 400, options);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("UNAUTHORIZED", message, 401, options);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("FORBIDDEN", message, 403, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("NOT_FOUND", message, 404, options);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("CONFLICT", message, 409, options);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("RATE_LIMITED", message, 429, options);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = "An unexpected error occurred.",
    options?: AppErrorOptions
  ) {
    super("INTERNAL_ERROR", message, 500, options);
  }
}

export function normalizeError(error: unknown, requestId?: string) {
  if (error instanceof AppError) {
    error.details = mergeRequestId(error.details, requestId);

    return error;
  }

  if (hasValidationIssues(error)) {
    return new ValidationError("Request validation failed.", {
      details: mergeRequestId(
        {
          issues: formatValidationIssues(error.issues)
        },
        requestId
      )
    });
  }

  return new InternalServerError("An unexpected error occurred.", {
    cause: error,
    details: mergeRequestId(undefined, requestId)
  });
}

export function toApiErrorResponse(error: AppError): ApiErrorResponse {
  if (error.details === undefined) {
    return {
      error: error.code,
      message: error.message
    };
  }

  return {
    details: error.details,
    error: error.code,
    message: error.message
  };
}
