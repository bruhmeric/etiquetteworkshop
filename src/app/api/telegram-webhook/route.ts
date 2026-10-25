import { NextRequest } from 'next/server';
import { getRegistrationById, updateRegistration } from '@/lib/store';
import { answerTelegramCallback, editTelegramMessage, escapeHtml, sendTicketEmail } from '@/lib/notify';
import { qrDataUrl, qrPngBuffer } from '@/lib/qr';

export const dynamic = 'force-dynamic';

/**
 * Telegram webhook. Bind after deployment with:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<app>.vercel.app/api/telegram-webhook
 * Optionally append `&secret_token=<TELEGRAM_WEBHOOK_SECRET>` for verification.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    // Silently ignore anything that is not Telegram.
    return new Response('OK');
  }

  const update = (await req.json().catch(() => null)) as {
    callback_query?: {
      id: string;
      data?: string;
      from?: { first_name?: string };
      message?: { chat?: { id?: number }; message_id?: number; text?: string };
    };
  } | null;

  const cb = update?.callback_query;
  if (!cb) return new Response('OK'); // plain messages are ignored

  try {
    const parsed = JSON.parse(cb.data || '{}') as { a?: string; id?: string };
    const action = parsed.a;
    const id = parsed.id;
    if (!action || !id) return new Response('OK');

    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    const originalText = cb.message?.text || '';
    const adminName = cb.from?.first_name || 'Admin';

    const rec = await getRegistrationById(id);
    if (rec) {
      if (action === 'app' && rec.status !== 'approved') {
        await updateRegistration(id, { status: 'approved', approved_by: adminName });

        const dataUrl = await qrDataUrl(rec.ticket_code);
        const png = await qrPngBuffer(rec.ticket_code);
        const email = await sendTicketEmail(rec, { dataUrl, pngBuffer: png });
        if (!email.ok && !email.skipped) {
          console.warn('[telegram-webhook] ticket email failed:', email.error);
        }

        if (chatId && messageId) {
          await editTelegramMessage(
            chatId,
            messageId,
            `${originalText}\n\n✅ <b>APPROVED BY:</b> ${escapeHtml(adminName)}`
          );
        }
      } else if (action === 'rej' && rec.status === 'pending') {
        await updateRegistration(id, { status: 'rejected' });
        if (chatId && messageId) {
          await editTelegramMessage(
            chatId,
            messageId,
            `${originalText}\n\n❌ <b>REJECTED BY:</b> ${escapeHtml(adminName)}`
          );
        }
      }
    }

    await answerTelegramCallback(cb.id, 'Action complete');
  } catch (e) {
    console.error('[telegram-webhook]', e);
    try {
      await answerTelegramCallback(cb.id, 'Something went wrong');
    } catch {
      /* ignore */
    }
  }

  return new Response('OK');
}
