/** Unique-ish code generators (matching the registration-system guide). */

export function makeRefCode(): string {
  return `EE-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function makeTicketCode(): string {
  return `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

/** Strip path separators & unsafe characters from an uploaded file name. */
export function sanitizeFileName(name: string): string {
  const base = (name || 'slip').split(/[\\/]/).pop() || 'slip';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return cleaned.length >= 3 ? cleaned : 'payment-slip.jpg';
}
