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
  /** Client-generated payment reference (EE-XXXXXX) shown to the user
   *  BEFORE they pay, so it can be written on the bank transfer. */
  paymentRef: string | null;
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

/* ── Telegram webhook status (GET /api/admin/telegram) ─────── */

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  ip_address?: string;
}

export interface TelegramStatusResponse {
  tokenConfigured: boolean;
  /** Username of the bot (from getMe) — null if the token is missing/invalid. */
  botUsername: string | null;
  /** Current webhook registration — null when no webhook is set. */
  webhook: TelegramWebhookInfo | null;
  /** The URL this deployment expects the webhook on. */
  expectedUrl: string;
  /** True when this deployment runs on localhost (Telegram can't reach it). */
  isLocal: boolean;
  secretConfigured: boolean;
  /**
   * When the registered webhook URL replies with an HTTP redirect (e.g. a
   * non-www domain 308-forwarding to the www one), this is the final URL it
   * redirects to — Telegram never follows redirects, so deliveries fail.
   */
  webhookRedirect?: string | null;
  error?: string;
}
