import type { NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { clientIp } from './rate-limit';

/**
 * Organizer console password.
 *
 * The console APIs ALWAYS require this key (sent as the `x-admin-key`
 * header). When the ADMIN_KEY environment variable is not set — e.g. in
 * the local preview or a fresh Vercel deploy — the documented default
 * below is used instead. Set ADMIN_KEY on Vercel to change it.
 */
export const DEFAULT_ADMIN_KEY = 'etiquette2027';

/** Max wrong passwords before the IP is locked out. */
const MAX_ATTEMPTS = 3;
/** Lockout window — counters reset this long after the first failure. */
const WINDOW_MS = 5 * 60 * 1000;

export function adminKey(): string {
  return process.env.ADMIN_KEY?.trim() || DEFAULT_ADMIN_KEY;
}

/* ── per-IP failure tracking (in-memory; best-effort on serverless) ── */
const failures = new Map<string, { count: number; firstAt: number }>();

function pruneExpired(now: number): void {
  for (const [ip, rec] of failures) {
    if (now - rec.firstAt > WINDOW_MS) failures.delete(ip);
  }
}

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 429; error: string };

/** Constant-time key comparison — digests first, so lengths always match. */
function keyMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Admin-password check for the organizer console APIs, with a 3-attempt
 * lockout per IP: after 3 wrong keys the IP gets 429s for WINDOW_MS,
 * even if the next key would have been correct.
 */
export function checkAdminAuth(req: NextRequest): AdminAuthResult {
  const ip = clientIp(req);
  const now = Date.now();
  const rec = failures.get(ip);

  if (rec && now - rec.firstAt > WINDOW_MS) {
    failures.delete(ip); // window elapsed — fresh start
  } else if (rec && rec.count >= MAX_ATTEMPTS) {
    return {
      ok: false,
      status: 429,
      error: 'Too many incorrect attempts — try again in a few minutes.',
    };
  }

  if (keyMatches(req.headers.get('x-admin-key'), adminKey())) {
    failures.delete(ip); // success clears the counter for this IP
    return { ok: true };
  }

  // record the failure
  const cur = failures.get(ip);
  if (cur && now - cur.firstAt <= WINDOW_MS) {
    cur.count += 1;
  } else {
    failures.set(ip, { count: 1, firstAt: now });
  }
  pruneExpired(now);
  return { ok: false, status: 401, error: 'Invalid admin key.' };
}
