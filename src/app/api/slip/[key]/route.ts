import { NextRequest } from 'next/server';
import { getDemoSlip } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/slip/[key] — serves payment slips in demo mode only.
 * Key is a 12-hex id, optionally suffixed `.pdf` (type hint for the console UI).
 * In production, slips live in the public Supabase `slips` bucket
 * and this route is never used.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: raw } = await params;
  const key = raw.replace(/\.pdf$/i, '');
  if (!/^[a-f0-9]{12}$/.test(key)) {
    return new Response('Not found', { status: 404 });
  }
  const slip = await getDemoSlip(key);
  if (!slip) {
    return new Response('Not found', { status: 404 });
  }
  const headers: Record<string, string> = {
    'Content-Type': slip.contentType,
    'Cache-Control': 'public, max-age=3600',
  };
  if (slip.contentType === 'application/pdf') {
    headers['Content-Disposition'] = 'inline; filename="payment-slip.pdf"';
  }
  return new Response(new Uint8Array(slip.data), { headers });
}
