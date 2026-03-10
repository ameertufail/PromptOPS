import type { Context, MiddlewareHandler } from "hono";
import { ValidationError } from "./errors";
import { parseWithSchema } from "./validation";
import type { AppEnv } from "../types";

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

export async function parseJsonRequestBody<T>(
  c: Context<AppEnv>,
  schema: SafeParseSchema<T>,
  message = "Request body validation failed."
) {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }

  return parseWithSchema(schema, body, message);
}

export function parseRequestParams<T>(
  c: Context<AppEnv>,
  schema: SafeParseSchema<T>,
  message = "Route parameter validation failed."
) {
  return parseWithSchema(schema, c.req.param(), message);
}

export function parseRequestQuery<T>(
  c: Context<AppEnv>,
  schema: SafeParseSchema<T>,
  message = "Query parameter validation failed."
) {
  const url = new URL(c.req.url);

  return parseWithSchema(schema, Object.fromEntries(url.searchParams.entries()), message);
}

export function validateRequestParams<T>(
  schema: SafeParseSchema<T>,
  message = "Route parameter validation failed."
) {
  return (async (c, next) => {
    parseRequestParams(c, schema, message);
    await next();
  }) satisfies MiddlewareHandler<AppEnv>;
}

export function validateRequestQuery<T>(
  schema: SafeParseSchema<T>,
  message = "Query parameter validation failed."
) {
  return (async (c, next) => {
    parseRequestQuery(c, schema, message);
    await next();
  }) satisfies MiddlewareHandler<AppEnv>;
}
