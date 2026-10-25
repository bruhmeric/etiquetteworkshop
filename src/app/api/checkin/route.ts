import { NextRequest, NextResponse } from 'next/server';
import { findRegistrationByCode, updateRegistration } from '@/lib/store';
import { isSafeCode } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import type { CheckinResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Scan attempts per IP per minute — plenty for the entrance desk (even a
 *  burst of manual typo retries), while blunting ticket-code brute force. */
const SCAN_LIMIT = 30;
const SCAN_WINDOW_MS = 60 * 1000;

/**
 * POST /api/checkin — entrance validation.
 * Body: { code } — a ticket code (TKT-…) or reference code (EE-…).
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`checkin:${clientIp(req)}`, SCAN_LIMIT, SCAN_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many scans from this device — wait ${rl.retryAfterSec}s and try again.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as { code?: string } | null;
    const code = (body?.code ?? '').trim().toUpperCase();
    if (!isSafeCode(code)) {
      const resp: CheckinResponse = { result: 'error', text: 'INVALID TICKET CODE' };
      return NextResponse.json(resp);
    }

    const rec = await findRegistrationByCode(code);
    if (!rec) {
      const resp: CheckinResponse = { result: 'error', text: 'INVALID TICKET CODE' };
      return NextResponse.json(resp);
    }
    if (rec.status !== 'approved') {
      const resp: CheckinResponse = {
        result: 'error',
        text: `UNAPPROVED TICKET (Status: ${rec.status})`,
      };
      return NextResponse.json(resp);
    }
    if (rec.checked_in) {
      const resp: CheckinResponse = {
        result: 'warning',
        text: `ALREADY SCANNED — ${rec.full_name}`,
        name: rec.full_name,
        category: rec.category,
        ticketCode: rec.ticket_code,
      };
      return NextResponse.json(resp);
    }

    await updateRegistration(rec.id, { checked_in: true });
    const resp: CheckinResponse = {
      result: 'success',
      text: `PASS VALID — Welcome ${rec.full_name}`,
      name: rec.full_name,
      category: rec.category,
      ticketCode: rec.ticket_code,
    };
    return NextResponse.json(resp);
  } catch (err) {
    console.error('[checkin]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
