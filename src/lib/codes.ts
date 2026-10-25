/**
 * Unique code generators (matching the registration-system guide).
 * Randomness comes from crypto.getRandomValues — Math.random() is
 * predictable and must not back ticket/reference codes.
 */

/** n random digits (0-9). Modulo bias here is ~6/2^32 — irrelevant. */
function randomDigits(n: number): string {
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (x) => String(x % 10)).join('');
}

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** n random upper-case alphanumeric characters. */
function randomCodeChars(n: number): string {
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('');
}

export function makeRefCode(): string {
  return `EE-${randomDigits(6)}`;
}

export function makeTicketCode(): string {
  return `TKT-${randomCodeChars(7)}`;
}

/** Strip path separators & unsafe characters from an uploaded file name. */
export function sanitizeFileName(name: string): string {
  const base = (name || 'slip').split(/[\\/]/).pop() || 'slip';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return cleaned.length >= 3 ? cleaned : 'payment-slip.jpg';
}

/** Unguessable 12-hex-character key used for demo-mode slip URLs
 *  (must match the `/^[a-f0-9]{12}$/` contract of /api/slip/[key]). */
export function makeSlipKey(): string {
  const buf = new Uint8Array(6); // 6 bytes → 12 hex chars
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}
