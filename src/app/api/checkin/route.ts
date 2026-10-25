import { NextRequest, NextResponse } from 'next/server';
import { findRegistrationByCode, updateRegistration } from '@/lib/store';
import { isSafeCode } from '@/lib/validation';
import type { CheckinResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkin — entrance validation.
 * Body: { code } — a ticket code (TKT-…) or reference code (EE-…).
 */
export async function POST(req: NextRequest) {
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
