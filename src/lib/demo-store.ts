import fs from 'node:fs';
import path from 'node:path';
import type { Registration } from './types';
import { makeSlipKey } from './codes';
import { priceFor } from '@/config/event';

/**
 * File-backed in-memory fallback used ONLY when Supabase env vars are absent
 * (local preview / demo mode). State is persisted to a JSON file so it
 * survives dev-server HMR restarts; every operation re-reads the file,
 * so concurrent module instances stay consistent.
 * In production (Vercel + Supabase) the real Supabase store is used instead.
 */

interface StoredSlip {
  contentType: string;
  /** base64 payload */
  data: string;
}

interface StoreFile {
  registrations: Registration[];
  slips: Record<string, StoredSlip>;
}

const STORE_PATH = path.join(process.cwd(), 'db', 'ee-demo-store.json');

function emptyStore(): StoreFile {
  return { registrations: [], slips: {} };
}

function load(): StoreFile {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StoreFile;
    if (Array.isArray(parsed?.registrations)) return parsed;
  } catch {
    /* fall through */
  }
  return emptyStore();
}

function save(store: StoreFile): void {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store));
  } catch {
    /* read-only fs (e.g. Vercel) — degrade to memory-per-request */
  }
}

/* ── A believable mock bank slip so the dashboard preview feels real ── */
function slipSvg(name: string, amount: number, ref: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="460" viewBox="0 0 760 460">
  <rect width="760" height="460" fill="#f7f4ec"/>
  <rect x="18" y="18" width="724" height="424" fill="#fffdf6" stroke="#c8b481" stroke-width="2"/>
  <rect x="34" y="34" width="692" height="392" fill="none" stroke="#c8b481" stroke-width="1"/>
  <text x="380" y="86" text-anchor="middle" font-family="Georgia, serif" font-size="15" letter-spacing="4" fill="#a94e5c">DEMO PAYMENT SLIP</text>
  <line x1="280" y1="102" x2="480" y2="102" stroke="#c8b481" stroke-width="1"/>
  <text x="380" y="146" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#3b2029">${esc(name)}</text>
  <text x="380" y="182" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#5e6b60">paid Rs. ${amount}.00 — Etiquette Essentials Workshop</text>
  <text x="380" y="212" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#5e6b60">Ref ${esc(ref)} · Internet banking transfer</text>
  <rect x="250" y="248" width="260" height="64" fill="none" stroke="#c8b481" stroke-width="1.5"/>
  <text x="380" y="278" text-anchor="middle" font-family="Georgia, serif" font-size="12" letter-spacing="2" fill="#8a927f">SAMPLE DATA</text>
  <text x="380" y="298" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#8a927f">(demo mode — no Supabase configured)</text>
  <text x="380" y="392" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#8a927f">BEd Intake 5 · Lyceum Campus, Nugegoda</text>
</svg>`;
}

function seedStore(): StoreFile {
  const now = Date.now();
  const H = 3600_000;
  const rows: Omit<Registration, 'slip_url'>[] = [
    {
      id: crypto.randomUUID(),
      reference_code: 'EE-482913',
      ticket_code: 'TKT-A3F7QKZ',
      full_name: 'Dilini Perera',
      email: 'dilini.perera@example.lk',
      phone: '+94 77 123 4567',
      category: 'Lyceum Campus Student',
      student_id: 'BEd/2026/041',
      amount: 700,
      status: 'approved',
      approved_by: 'Sachini',
      checked_in: false,
      created_at: new Date(now - 30 * H).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      reference_code: 'EE-715208',
      ticket_code: 'TKT-B9M2RTQ',
      full_name: 'Kavindu Silva',
      email: 'kavindu.silva@example.lk',
      phone: '+94 71 555 0192',
      category: 'External Participant',
      student_id: null,
      amount: 1000,
      status: 'approved',
      approved_by: 'Sachini',
      checked_in: true,
      created_at: new Date(now - 26 * H).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      reference_code: 'EE-903471',
      ticket_code: 'TKT-C4D8HLP',
      full_name: 'Amaya Fernando',
      email: 'amaya.fernando@example.lk',
      phone: '+94 76 440 2280',
      category: 'Lyceum Campus Student',
      student_id: 'BEd/2026/112',
      amount: 700,
      status: 'pending',
      approved_by: null,
      checked_in: false,
      created_at: new Date(now - 5 * H).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      reference_code: 'EE-338264',
      ticket_code: 'TKT-D2K6WZN',
      full_name: 'Nuwan Dias',
      email: 'nuwan.dias@example.lk',
      phone: '+94 70 981 7356',
      category: 'External Participant',
      student_id: null,
      amount: 1000,
      status: 'rejected',
      approved_by: null,
      checked_in: false,
      created_at: new Date(now - 49 * H).toISOString(),
    },
  ];
  const store: StoreFile = { registrations: [], slips: {} };
  for (const row of rows) {
    const key = makeSlipKey();
    store.slips[key] = {
      contentType: 'image/svg+xml',
      data: Buffer.from(
        slipSvg(row.full_name, row.amount ?? priceFor(row.category), row.reference_code),
        'utf-8'
      ).toString('base64'),
    };
    store.registrations.push({ ...row, slip_url: `/api/slip/${key}` });
  }
  save(store);
  return store;
}

function withStore<T>(fn: (s: StoreFile) => T): T {
  let store = load();
  if (store.registrations.length === 0 && Object.keys(store.slips).length === 0) {
    store = seedStore();
  }
  return fn(store);
}

function persist(s: StoreFile): void {
  save(s);
}

export const demoStore = {
  list(): Registration[] {
    return withStore((s) => [...s.registrations].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
  },

  byId(id: string): Registration | null {
    return withStore((s) => s.registrations.find((r) => r.id === id) ?? null);
  },

  /** Lookup by ticket code first, then reference code (case-insensitive). */
  byCode(code: string): Registration | null {
    const norm = code.trim().toUpperCase();
    return withStore(
      (s) =>
        s.registrations.find((r) => r.ticket_code.toUpperCase() === norm) ??
        s.registrations.find((r) => r.reference_code.toUpperCase() === norm) ??
        null
    );
  },

  hasCodeConflict(ref: string, ticket: string): boolean {
    return withStore(
      (s) => s.registrations.some((r) => r.reference_code === ref || r.ticket_code === ticket)
    );
  },

  insert(rec: Registration, slip: { data: Uint8Array; contentType: string }): Registration {
    return withStore((s) => {
      const key = makeSlipKey();
      s.slips[key] = { contentType: slip.contentType, data: Buffer.from(slip.data).toString('base64') };
      // `.pdf` suffix lets the console UI pick the right viewer for PDF slips.
      const suffix = slip.contentType === 'application/pdf' ? '.pdf' : '';
      const withSlip: Registration = { ...rec, slip_url: `/api/slip/${key}${suffix}` };
      s.registrations.push(withSlip);
      persist(s);
      return withSlip;
    });
  },

  update(id: string, patch: Partial<Registration>): Registration | null {
    return withStore((s) => {
      const idx = s.registrations.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      s.registrations[idx] = { ...s.registrations[idx], ...patch };
      persist(s);
      return { ...s.registrations[idx] };
    });
  },

  getSlip(key: string): { data: Uint8Array; contentType: string } | undefined {
    return withStore((s) => {
      const slip = s.slips[key];
      if (!slip) return undefined;
      return { contentType: slip.contentType, data: new Uint8Array(Buffer.from(slip.data, 'base64')) };
    });
  },
};
