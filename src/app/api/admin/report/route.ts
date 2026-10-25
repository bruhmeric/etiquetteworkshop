import { NextRequest, NextResponse } from 'next/server';
import { listRegistrations, storageMode } from '@/lib/store';
import { checkAdminAuth } from '@/lib/admin-auth';
import { EVENT, TICKET_CATEGORIES } from '@/config/event';
import type { Registration } from '@/lib/types';

export const dynamic = 'force-dynamic';

/* ── CSV helpers (Excel-friendly: UTF-8 BOM, CRLF, quoted cells) ── */

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(cells: unknown[]): string {
  return cells.map(csvCell).join(',');
}

/** Sri-Lanka-time formatters — the organizers read these, Vercel runs UTC. */
const LK = 'Asia/Colombo';
function lkDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: LK,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
function lkDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: LK,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * GET /api/admin/report — downloadable CSV report for the organizer console:
 * summary (how many invites / paid / came), per-category breakdown, the full
 * participant table (every stored detail) and the attendee list.
 * Header: x-admin-key (organizer password — always required).
 */
export async function GET(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    // Newest-first from the store; the report reads oldest-first so "#" is
    // the registration order.
    const registrations = [...(await listRegistrations())].sort((a, b) =>
      a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
    );

    /* ── aggregate ── */
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let checkedIn = 0;
    let revenue = 0;
    for (const r of registrations) {
      if (r.status === 'approved') {
        approved++;
        revenue += r.amount;
        if (r.checked_in) checkedIn++;
      } else if (r.status === 'pending') pending++;
      else if (r.status === 'rejected') rejected++;
    }
    const attendance = approved > 0 ? Math.round((checkedIn / approved) * 100) : 0;

    const byCategory = TICKET_CATEGORIES.map((cat) => {
      const rows = registrations.filter((r) => r.category === cat.id);
      const catApproved = rows.filter((r) => r.status === 'approved');
      return {
        id: cat.id,
        total: rows.length,
        approved: catApproved.length,
        checkedIn: catApproved.filter((r) => r.checked_in).length,
        revenue: catApproved.reduce((sum, r) => sum + r.amount, 0),
      };
    });

    const attendees = registrations.filter((r) => r.status === 'approved' && r.checked_in);
    const generatedAt = lkDateTime(new Date().toISOString());

    /* ── build the CSV ── */
    const lines: string[] = [
      row(['ETIQUETTE ESSENTIALS — REGISTRATION REPORT']),
      '',
      row(['Event', `${EVENT.name} ${EVENT.kind}`]),
      row(['Date', EVENT.date.long]),
      row(['Time', `${EVENT.time.display} (doors ${EVENT.time.doors})`]),
      row(['Venue', EVENT.venue.full]),
      row(['Generated', `${generatedAt} (Sri Lanka time)`]),
      row(['Data source', storageMode() === 'supabase' ? 'Supabase (live data)' : 'Demo mode (sample data)']),
      '',
      row(['SUMMARY']),
      row(['Total registrations (invites)', registrations.length]),
      row(['Approved — paid & ticketed', approved]),
      row(['Pending review', pending]),
      row(['Rejected', rejected]),
      row(['Checked in — who came', checkedIn]),
      row(['Attendance rate (of approved)', `${attendance}%`]),
      row(['Revenue collected (approved)', `Rs. ${revenue.toLocaleString('en-US')}`]),
      '',
      row(['BY CATEGORY']),
      row(['Category', 'Registrations', 'Approved (paid)', 'Checked in', 'Revenue (Rs.)']),
      ...byCategory.map((c) => row([c.id, c.total, c.approved, c.checkedIn, c.revenue])),
      row(['TOTAL', registrations.length, approved, checkedIn, revenue]),
      '',
      row(['PARTICIPANTS — ALL DETAILS']),
      row([
        '#',
        'Payment Ref',
        'Ticket Code',
        'Name',
        'Email',
        'Phone',
        'Category',
        'Student ID',
        'Amount (Rs.)',
        'Status',
        'Checked In',
        'Registered At',
        'Approved By',
      ]),
      ...registrations.map((r: Registration, i: number) =>
        row([
          i + 1,
          r.reference_code,
          r.ticket_code,
          r.full_name,
          r.email,
          r.phone,
          r.category,
          r.student_id ?? '',
          r.amount,
          r.status.charAt(0).toUpperCase() + r.status.slice(1),
          r.checked_in ? 'Yes' : 'No',
          lkDateTime(r.created_at),
          r.approved_by ?? '',
        ])
      ),
      '',
      row(['ATTENDEES — WHO CAME (CHECKED IN)']),
      row(['#', 'Name', 'Category', 'Ticket Code', 'Phone']),
      ...attendees.map((r, i) => row([i + 1, r.full_name, r.category, r.ticket_code, r.phone])),
    ];

    const csv = '\uFEFF' + lines.join('\r\n') + '\r\n';
    const filename = `etiquette-essentials-report-${lkDate(new Date())}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[admin/report]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
