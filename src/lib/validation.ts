import type { ValidRegistration } from './types';
import { TICKET_CATEGORIES } from '@/config/event';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d][\d\s\-()]{6,19}$/;
const SLIP_RE = /^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/;
const MAX_DECODED = 4 * 1024 * 1024; // 4 MB (images compressed client-side, PDFs capped at 3 MB)

/**
 * Lyceum Campus student ID — e.g. BEd-PE-26-05-0015
 * (programme-specialisation-year-intake-serial).
 */
const STUDENT_ID_RE = /^[A-Za-z]{2,4}-[A-Za-z]{2,4}-\d{2}-\d{2}-\d{4}$/;
export const STUDENT_ID_EXAMPLE = 'BEd-PE-26-05-0015';

export type ValidationResult =
  | { ok: true; value: ValidRegistration }
  | { ok: false; error: string };

export function validateRegistration(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Invalid request body.' };
  }
  const b = raw as Record<string, unknown>;

  const fullName = String(b.fullName ?? '').trim();
  if (fullName.length < 2 || fullName.length > 80) {
    return { ok: false, error: 'Please enter your full name (2–80 characters).' };
  }

  const email = String(b.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const phone = String(b.phone ?? '').trim();
  if (!PHONE_RE.test(phone)) {
    return { ok: false, error: 'Please enter a valid phone number.' };
  }

  const category = String(b.category ?? '');
  const cat = TICKET_CATEGORIES.find((c) => c.id === category);
  if (!cat) {
    return { ok: false, error: 'Please choose a valid ticket category.' };
  }

  let studentId: string | null = null;
  if (cat.requiresStudentId) {
    studentId = String(b.studentId ?? '').trim();
    if (!STUDENT_ID_RE.test(studentId)) {
      return {
        ok: false,
        error: `Please enter a valid Lyceum Campus student ID, e.g. ${STUDENT_ID_EXAMPLE}.`,
      };
    }
  }

  const slipBase64 = String(b.slipBase64 ?? '');
  const match = slipBase64.match(SLIP_RE);
  if (!match) {
    return {
      ok: false,
      error: 'Please upload your payment slip as a JPG, PNG, WebP image or a PDF file.',
    };
  }
  const isPdf = match[1] === 'application/pdf';
  const decoded = Buffer.from(match[3], 'base64');
  if (decoded.length < 1024) {
    return { ok: false, error: 'The uploaded slip looks empty. Please try again.' };
  }
  if (decoded.length > MAX_DECODED) {
    return {
      ok: false,
      error: 'The slip file is too large (max 4 MB). Please re-upload a smaller file.',
    };
  }
  if (isPdf && decoded.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return { ok: false, error: 'That file is not a valid PDF. Please re-upload your slip.' };
  }

  const slipFileName = String(b.slipFileName ?? 'payment-slip.jpg')
    .split(/[\\/]/).pop()!
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80) || 'payment-slip.jpg';

  return {
    ok: true,
    value: { fullName, email, phone, category: cat.id, studentId, slipBase64, slipFileName },
  };
}

/** Ticket / reference codes are the only free-text ever interpolated into DB queries. */
export function isSafeCode(code: string): boolean {
  return /^[A-Z0-9-]{4,20}$/.test(code);
}
