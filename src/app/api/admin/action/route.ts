import { NextRequest, NextResponse } from 'next/server';
import { getRegistrationById, updateRegistration } from '@/lib/store';
import { sendTicketEmail } from '@/lib/notify';
import { qrDataUrl, qrPngBuffer } from '@/lib/qr';
import { checkAdminAuth } from '@/lib/admin-auth';
import type { ActionResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/action — web fallback for the Telegram approve/reject buttons.
 * Body: { id, action: 'approve' | 'reject', adminName? }
 * Header: x-admin-key (organizer password — always required).
 */
export async function POST(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = (await req.json().catch(() => null)) as {
      id?: string;
      action?: 'approve' | 'reject';
      adminName?: string;
    } | null;
    if (!body?.id || (body.action !== 'approve' && body.action !== 'reject')) {
      return NextResponse.json(
        { error: 'Provide id and action (approve|reject).' },
        { status: 400 }
      );
    }

    const rec = await getRegistrationById(body.id);
    if (!rec) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }
    const adminName = (body.adminName || 'Organizer (console)').slice(0, 60);

    if (body.action === 'approve') {
      if (rec.status === 'rejected') {
        const resp: ActionResponse = {
          success: false,
          error: 'This registration was already rejected.',
        };
        return NextResponse.json(resp, { status: 409 });
      }
      if (rec.status === 'approved') {
        // Idempotent — just re-show the ticket.
        const dataUrl = await qrDataUrl(rec.ticket_code);
        const resp: ActionResponse = { success: true, already: true, qrDataUrl: dataUrl };
        return NextResponse.json(resp);
      }

      const updated = await updateRegistration(rec.id, {
        status: 'approved',
        approved_by: adminName,
      });
      const dataUrl = await qrDataUrl(rec.ticket_code);
      const png = await qrPngBuffer(rec.ticket_code);
      const email = updated
        ? await sendTicketEmail(updated, { dataUrl, pngBuffer: png })
        : { ok: false, skipped: true };
      if (!email.ok && !email.skipped) {
        console.warn('[admin/action] ticket email failed:', email.error);
      }
      const resp: ActionResponse = {
        success: true,
        qrDataUrl: dataUrl,
        emailSent: email.ok,
        emailSkipped: email.skipped,
      };
      return NextResponse.json(resp);
    }

    // reject
    if (rec.status !== 'pending') {
      const resp: ActionResponse = {
        success: false,
        error: `Cannot reject — status is "${rec.status}".`,
      };
      return NextResponse.json(resp, { status: 409 });
    }
    await updateRegistration(rec.id, { status: 'rejected' });
    const resp: ActionResponse = { success: true };
    return NextResponse.json(resp);
  } catch (err) {
    console.error('[admin/action]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
