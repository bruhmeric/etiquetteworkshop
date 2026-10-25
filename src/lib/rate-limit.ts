import type { NextRequest } from 'next/server';

/**
 * Minimal in-memory fixed-window rate limiter (best-effort on serverless —
 * each warm lambda instance keeps its own counters, which is enough to slow
 * scripted abuse of the public endpoints).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Prune stale buckets once the map grows, so memory stays bounded. */
const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (0 when ok). */
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Best-available client IP (platform proxy header; Vercel overwrites XFF). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
