import { NextRequest, NextResponse } from 'next/server';
import { listRegistrations, storageMode } from '@/lib/store';
import { telegramConfigured, emailConfigured } from '@/lib/notify';
import { checkAdminAuth } from '@/lib/admin-auth';
import type { AdminListResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

/* GET: every registration + stats for the organizer console (password-protected). */
export async function GET(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const registrations = await listRegistrations();
    const counts = { pending: 0, approved: 0, rejected: 0, checkedIn: 0, revenue: 0 };
    for (const r of registrations) {
      if (r.status === 'pending') counts.pending++;
      if (r.status === 'rejected') counts.rejected++;
      if (r.status === 'approved') {
        counts.approved++;
        counts.revenue += r.amount;
        if (r.checked_in) counts.checkedIn++;
      }
    }
    const payload: AdminListResponse = {
      mode: storageMode(),
      telegramConfigured: telegramConfigured(),
      emailConfigured: emailConfigured(),
      registrations,
      counts,
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[admin/list]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
