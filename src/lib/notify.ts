import { Resend } from 'resend';
import type { Registration } from './types';
import { getSupabase } from './supabase';
import { generateTicketPdf, ticketPdfFilename } from './ticket-pdf';
import { EVENT } from '@/config/event';

/* ───────────────────────── Telegram helpers ───────────────────── */

function tgConfig() {
  return { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID };
}

export function telegramConfigured(): boolean {
  const { token, chatId } = tgConfig();
  return Boolean(token && chatId);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildNewRegistrationMessage(rec: Registration): string {
  const lines = [
    '🚨 <b>NEW REGISTRATION SUBMISSION</b>',
    '',
    `<b>Payment Ref:</b> <code>${escapeHtml(rec.reference_code)}</code>`,
    `<b>Name:</b> ${escapeHtml(rec.full_name)}`,
    `<b>Email:</b> ${escapeHtml(rec.email)}`,
    `<b>Phone:</b> ${escapeHtml(rec.phone)}`,
    `<b>Category:</b> ${escapeHtml(rec.category)}`,
  ];
  if (rec.student_id) lines.push(`<b>Student ID:</b> ${escapeHtml(rec.student_id)}`);
  lines.push(`<b>Amount:</b> Rs. ${rec.amount}`);
  lines.push(`<b>Receipt:</b> <a href="${rec.slip_url}">View payment slip</a>`);
  return lines.join('\n');
}

export function approveRejectKeyboard(id: string) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Approve & Send Ticket', callback_data: JSON.stringify({ a: 'app', id }) },
        { text: '❌ Reject', callback_data: JSON.stringify({ a: 'rej', id }) },
      ],
    ],
  };
}

type TgResult = { ok: boolean; skipped?: boolean; error?: string };

/** Generic Telegram Bot API call returning the parsed `result` payload. */
export async function telegramRequest<T>(
  method: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; result?: T; error?: string }> {
  const { token } = tgConfig();
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not set.' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: T;
      description?: string;
    };
    if (!res.ok || json.ok === false) {
      return { ok: false, error: json.description || `HTTP ${res.status}` };
    }
    return { ok: true, result: json.result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function tgApi(method: string, body: Record<string, unknown>): Promise<TgResult> {
  const r = await telegramRequest<unknown>(method, body);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

export function sendTelegramMessage(
  text: string,
  replyMarkup?: { inline_keyboard: unknown[][] }
): Promise<TgResult> {
  const { chatId } = tgConfig();
  return tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string
): Promise<TgResult> {
  return tgApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

export function answerTelegramCallback(
  callbackQueryId: string,
  text = 'Action complete'
): Promise<TgResult> {
  return tgApi('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

/* ───────────────────── Ticket email (Resend) ───────────────────── */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function buildTicketEmail(rec: Registration, qrSrc: string, hasTicketPdf = false): string {
  const e = escapeHtml;
  const ticketPdfNote = hasTicketPdf
    ? `<div style="background:#f6eee6; padding:14px 20px; border-radius:8px; margin:20px 0; font-size:13px; line-height:1.8; color:#692136; border:1px solid #e5d5c5;">
        <strong style="letter-spacing:.08em;">YOUR PERSONALISED TICKET IS ATTACHED 📎</strong><br/>
        <span style="color:#1c2d5a;">Open the attached PDF — it carries your name and ticket number on the official workshop design (${e(rec.category)}, Rs. ${rec.amount}). Print it or keep it on your phone; show it together with the QR code at the entrance.</span>
      </div>`
    : '';
  return `<div style="font-family: Georgia, 'Times New Roman', serif; background:#faf7f0; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #d8e0f0; border-radius:12px; padding:32px;">
    <p style="letter-spacing:.28em; font-size:11px; color:#265aa2; text-transform:uppercase; text-align:center; margin:0 0 10px; font-family:Verdana, sans-serif;">Etiquette Essentials</p>
    <h2 style="color:#1c2d5a; text-align:center; margin:0 0 20px; font-weight:600; font-size:22px;">YOU'RE IN — WORKSHOP PASS</h2>
    <p style="color:#1c2d5a; line-height:1.7;">Dear <strong>${e(rec.full_name)}</strong>,</p>
    <p style="color:#1c2d5a; line-height:1.7;">Your payment for <strong>Etiquette Essentials</strong> has been verified. Here is your entry ticket:</p>
    <div style="background:#edf2fc; padding:16px 20px; border-radius:8px; margin:20px 0; font-size:14px; line-height:2; color:#1c2d5a;">
      <span><strong>Event:</strong> Etiquette Essentials Workshop</span><br/>
      <span><strong>Date:</strong> ${EVENT.date.long}</span><br/>
      <span><strong>Time:</strong> ${EVENT.time.display}</span><br/>
      <span><strong>Venue:</strong> ${EVENT.venue.full}</span><br/>
      <span><strong>Category:</strong> ${e(rec.category)}</span><br/>
      <span><strong>Payment ref:</strong> <span style="font-family:Consolas, monospace; color:#1c2d5a;">${e(rec.reference_code)}</span></span><br/>
      <span><strong>Ticket Code:</strong> <span style="font-family:Consolas, monospace; font-size:15px; color:#1c2d5a;">${e(rec.ticket_code)}</span></span>
    </div>
    <div style="text-align:center; margin:28px 0;">
      <img src="${qrSrc}" alt="Entry QR code" style="width:180px; height:180px; border-radius:8px; border:1px solid #d8e0f0;"/>
      <p style="font-size:12px; color:#5e6b60; margin-top:10px; font-family:Verdana, sans-serif;">Scan this QR code at the entrance for entry validation.</p>
    </div>
    ${ticketPdfNote}
    <hr style="border:none; border-top:1px solid #d8e0f0; margin:22px 0;"/>
    <p style="font-size:12px; color:#8a927f; text-align:center; margin:0; font-family:Verdana, sans-serif;">${EVENT.organizer}</p>
  </div>
</div>`;
}

/**
 * Sends the QR ticket email. When Supabase is configured the QR PNG is
 * uploaded to the public `slips` bucket and referenced by URL (data-URI
 * images are stripped by Gmail & co).
 */
export async function sendTicketEmail(
  rec: Registration,
  qr: { dataUrl: string; pngBuffer: Uint8Array }
): Promise<TgResult> {
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: true };
  try {
    let qrSrc = qr.dataUrl;
    const sb = getSupabase();
    if (sb) {
      const path = `qrs/${rec.ticket_code}.png`;
      const { error } = await sb.storage
        .from('slips')
        .upload(path, qr.pngBuffer, { contentType: 'image/png', upsert: true });
      if (!error) {
        const { data } = sb.storage.from('slips').getPublicUrl(path);
        if (data?.publicUrl) qrSrc = data.publicUrl;
      }
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM || 'Etiquette Essentials <onboarding@resend.dev>';

    // Personalised designed ticket (student Rs. 700 / external Rs. 1,000) —
    // attached when the design assets are available; the email itself never
    // depends on it.
    const ticketPdf = await generateTicketPdf(rec);
    const attachments = ticketPdf
      ? [{ filename: ticketPdfFilename(rec), content: Buffer.from(ticketPdf).toString('base64') }]
      : undefined;

    const { error: sendError } = await resend.emails.send({
      from,
      to: rec.email,
      subject: 'Confirmed Ticket — Etiquette Essentials Workshop',
      html: buildTicketEmail(rec, qrSrc, Boolean(ticketPdf)),
      ...(attachments ? { attachments } : {}),
    });
    if (sendError) {
      return { ok: false, error: `Resend rejected the email: ${sendError.message}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
