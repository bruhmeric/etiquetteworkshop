import { getSupabase } from './supabase';
import { demoStore } from './demo-store';
import { makeRefCode, makeTicketCode, sanitizeFileName } from './codes';
import { priceFor } from '@/config/event';
import type { Registration, StorageMode, ValidRegistration } from './types';

/**
 * Unified registration store.
 *  - Supabase mode  : DB table `registrations` + public `slips` storage bucket.
 *  - Demo mode      : in-memory store (used when env vars are absent).
 */

export function storageMode(): StorageMode {
  return getSupabase() ? 'supabase' : 'demo';
}

function asRow(rec: Registration): Registration {
  return { ...rec, created_at: String(rec.created_at) };
}

export async function listRegistrations(): Promise<Registration[]> {
  const sb = getSupabase();
  if (!sb) return demoStore.list();
  const { data, error } = await sb
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Supabase list failed: ${error.message}`);
  return (data ?? []).map(asRow);
}

export async function getRegistrationById(id: string): Promise<Registration | null> {
  const sb = getSupabase();
  if (!sb) return demoStore.byId(id);
  const { data, error } = await sb.from('registrations').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Supabase lookup failed: ${error.message}`);
  return data ? asRow(data) : null;
}

/** Lookup by ticket code first, then reference code (case-insensitive). */
export async function findRegistrationByCode(code: string): Promise<Registration | null> {
  const norm = code.trim().toUpperCase();
  const sb = getSupabase();
  if (!sb) return demoStore.byCode(norm);
  const { data, error } = await sb
    .from('registrations')
    .select('*')
    .or(`ticket_code.eq.${norm},reference_code.eq.${norm}`)
    .maybeSingle();
  if (error) throw new Error(`Supabase lookup failed: ${error.message}`);
  return data ? asRow(data) : null;
}

export async function updateRegistration(
  id: string,
  patch: Partial<Registration>
): Promise<Registration | null> {
  const sb = getSupabase();
  if (!sb) return demoStore.update(id, patch);
  const { data, error } = await sb
    .from('registrations')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(`Supabase update failed: ${error.message}`);
  return data ? asRow(data) : null;
}

export async function getDemoSlip(
  key: string
): Promise<{ data: Uint8Array; contentType: string } | undefined> {
  if (getSupabase()) return undefined; // real slips live in Supabase Storage
  return demoStore.getSlip(key);
}

/**
 * Creates a pending registration:
 * generates codes → uploads slip → inserts row.
 * Retries (max 4) when generated codes collide with existing ones.
 */
export async function createRegistration(
  input: ValidRegistration
): Promise<Registration> {
  const slipMatch = input.slipBase64.match(
    /^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/i
  );
  if (!slipMatch) throw new Error('Slip payload is malformed.');
  const contentType =
    slipMatch[1] === 'application/pdf'
      ? 'application/pdf'
      : slipMatch[2] === 'jpg'
        ? 'image/jpeg'
        : `image/${slipMatch[2]}`;
  const slipBytes = new Uint8Array(Buffer.from(slipMatch[3], 'base64'));
  const fileName = sanitizeFileName(input.slipFileName);
  const amount = priceFor(input.category);

  const sb = getSupabase();
  if (!sb) {
    // ── demo mode ──
    for (let attempt = 0; attempt < 4; attempt++) {
      // First attempt honors the client-provided payment reference (the number
      // the registrant wrote on their bank transfer); retries fall back to a
      // freshly generated code if it collides with an existing one.
      const refCode = attempt === 0 && input.paymentRef ? input.paymentRef : makeRefCode();
      const ticketCode = makeTicketCode();
      if (demoStore.hasCodeConflict(refCode, ticketCode)) continue;
      return demoStore.insert(
        {
          id: crypto.randomUUID(),
          reference_code: refCode,
          ticket_code: ticketCode,
          full_name: input.fullName,
          email: input.email,
          phone: input.phone,
          category: input.category,
          student_id: input.studentId,
          amount,
          slip_url: '',
          status: 'pending',
          approved_by: null,
          checked_in: false,
          created_at: new Date().toISOString(),
        },
        { data: slipBytes, contentType }
      );
    }
    throw new Error('Could not generate a unique reference code.');
  }

  // ── supabase mode ──
  for (let attempt = 0; attempt < 4; attempt++) {
    const refCode = attempt === 0 && input.paymentRef ? input.paymentRef : makeRefCode();
    const ticketCode = makeTicketCode();

    const path = `slips/${Date.now()}_${fileName}`;
    const { error: upErr } = await sb.storage
      .from('slips')
      .upload(path, slipBytes, { contentType, upsert: false });
    if (upErr) throw new Error(`Slip upload failed: ${upErr.message}`);
    const { data: urlData } = sb.storage.from('slips').getPublicUrl(path);

    const { data: rec, error } = await sb
      .from('registrations')
      .insert({
        reference_code: refCode,
        ticket_code: ticketCode,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        category: input.category,
        student_id: input.studentId,
        amount,
        slip_url: urlData.publicUrl,
        status: 'pending',
      })
      .select()
      .maybeSingle();

    if (error) {
      // Unique-code collision → regenerate & retry; anything else is fatal.
      if (/duplicate key|unique/i.test(error.message) && attempt < 3) continue;
      throw new Error(`Registration failed: ${error.message}`);
    }
    if (rec) return asRow(rec);
  }
  throw new Error('Could not generate a unique reference code.');
}
