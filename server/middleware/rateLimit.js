import { env } from "../config/env.js";
import { ApiError } from "../utils/http.js";

const buckets = new Map();

export function rateLimit(req, _res, next) {
  const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const bucket = buckets.get(key) ?? { count: 0, resetAt: now + env.rateLimitWindowMs };

  if (bucket.resetAt < now) {
    bucket.count = 0;
    bucket.resetAt = now + env.rateLimitWindowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > env.rateLimitMax) {
    return next(new ApiError(429, "Too many requests. Please try again later."));
  }

  next();
}
