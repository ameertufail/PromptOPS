import type { MiddlewareHandler } from "hono";
import { RateLimitError } from "../lib/errors";
import { getRequestContext } from "../lib/request-context";
import type { AppEnv } from "../types";

type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

// Limitation: In-memory rate limit state is per-isolate and not shared across
// Cloudflare Worker instances. Under high traffic, each isolate maintains its
// own independent bucket map, so the effective limit may be higher than
// configured. Consider Durable Objects or an external store for strict limits.
const apiKeyBuckets = new Map<string, RateLimitBucket>();

export function resetRateLimitState() {
  apiKeyBuckets.clear();
}

export function createApiKeyRateLimitMiddleware(
  options: RateLimitOptions = {}
) {
  const limit = options.limit ?? 100;
  const windowMs = options.windowMs ?? 60_000;

  return (async (c, next) => {
    const requestContext = getRequestContext(c);

    if (requestContext.identity.kind !== "api_key") {
      throw new RateLimitError(
        "API key authentication is required before rate limiting."
      );
    }

    const bucketKey = requestContext.identity.apiKeyId;
    const now = Date.now();
    const existingBucket = apiKeyBuckets.get(bucketKey);
    const bucket =
      existingBucket && existingBucket.resetAt > now
        ? existingBucket
        : {
            count: 0,
            resetAt: now + windowMs
          };

    bucket.count += 1;
    apiKeyBuckets.set(bucketKey, bucket);

    const remaining = Math.max(limit - bucket.count, 0);
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000)
      );

      throw new RateLimitError("Rate limit exceeded.", {
        details: {
          limit,
          retryAfterSeconds,
          windowMs
        },
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000))
        }
      });
    }

    await next();
  }) satisfies MiddlewareHandler<AppEnv>;
}
