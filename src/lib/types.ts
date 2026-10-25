import type { Category } from '@/config/event';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type StorageMode = 'supabase' | 'demo';

/** Mirrors the Supabase `registrations` table exactly (snake_case columns). */
export interface Registration {
  id: string;
  reference_code: string;
  ticket_code: string;
  full_name: string;
  email: string;
  phone: string;
  category: Category;
  student_id: string | null;
  amount: number;
  slip_url: string;
  status: RegistrationStatus;
  approved_by: string | null;
  checked_in: boolean;
  created_at: string;
}

/** Fully validated payload accepted by POST /api/register. */
export interface ValidRegistration {
  fullName: string;
  email: string;
  phone: string;
  category: Category;
  studentId: string | null;
  slipBase64: string;
  slipFileName: string;
}

/* ── API response contracts shared by client & server ─────────── */

export interface AdminCounts {
  pending: number;
  approved: number;
  rejected: number;
  checkedIn: number;
  revenue: number;
}

export interface AdminListResponse {
  mode: StorageMode;
  telegramConfigured: boolean;
  emailConfigured: boolean;
  registrations: Registration[];
  counts: AdminCounts;
}

export interface ActionResponse {
  success: boolean;
  already?: boolean;
  qrDataUrl?: string;
  emailSent?: boolean;
  emailSkipped?: boolean;
  error?: string;
}

export interface CheckinResponse {
  result: 'success' | 'warning' | 'error';
  text: string;
  name?: string;
  category?: string;
  ticketCode?: string;
}

export interface RegisterSuccessResponse {
  success: true;
  refCode: string;
  mode: StorageMode;
}
