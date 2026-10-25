import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { telegramRequest } from '@/lib/notify';
import type { TelegramStatusResponse, TelegramWebhookInfo } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Public origin of this deployment (Vercel proxy headers aware). */
function publicOrigin(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, '');
  const host =
    req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = req.headers.get('x-forwarded-proto') || (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
}

function isLocalOrigin(origin: string): boolean {
  return /^http:\/\//.test(origin) || /\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(origin);
}

/**
 * If `url` replies with an HTTP redirect (3xx), return the final URL it
 * forwards to — Telegram refuses to follow redirects, so a webhook that
 * redirects (e.g. non-www domain → www on Vercel) never receives button
 * presses. Returns null when the URL answers directly.
 */
async function redirectTarget(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      redirect: 'manual',
      signal: AbortSignal.timeout(4000),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (loc) {
        try {
          return new URL(loc, url).toString().replace(/\/+$/, '');
        } catch {
          return loc;
        }
      }
    }
  } catch {
    /* unreachable or timed out — treat as "answers directly" */
  }
  return null;
}

async function buildStatus(
  req: NextRequest,
  tokenConfigured: boolean
): Promise<TelegramStatusResponse> {
  const origin = publicOrigin(req);
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || '';
  const base: TelegramStatusResponse = {
    tokenConfigured,
    botUsername: null,
    webhook: null,
    expectedUrl: `${origin}/api/telegram-webhook`,
    isLocal: isLocalOrigin(origin),
    secretConfigured: Boolean(secret),
  };
  if (!tokenConfigured) return base;

  const [me, hook] = await Promise.all([
    telegramRequest<{ username?: string }>('getMe'),
    telegramRequest<TelegramWebhookInfo>('getWebhookInfo'),
  ]);

  if (me.ok && me.result?.username) base.botUsername = me.result.username;
  else if (!me.ok) base.error = `Bot check failed: ${me.error}`;

  if (hook.ok && hook.result && hook.result.url) {
    base.webhook = {
      url: hook.result.url,
      has_custom_certificate: hook.result.has_custom_certificate,
      pending_update_count: hook.result.pending_update_count,
      last_error_date: hook.result.last_error_date,
      last_error_message: hook.result.last_error_message,
      ip_address: hook.result.ip_address,
    };
    base.webhookRedirect = await redirectTarget(hook.result.url);
  } else if (!hook.ok) {
    base.error = `${base.error ? base.error + ' ' : ''}Webhook check failed: ${hook.error}`;
  }
  return base;
}

/**
 * GET /api/admin/telegram — Telegram integration status:
 * is the bot token valid, is the webhook registered (and where does it point),
 * are there pending updates or delivery errors.
 */
export async function GET(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const status = await buildStatus(req, Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()));
  return NextResponse.json(status);
}

/**
 * POST /api/admin/telegram — register or remove the webhook that delivers
 * Approve/Reject button presses to this deployment.
 * Body: { action: 'set' | 'delete' }
 */
export async function POST(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = (await req.json().catch(() => null)) as { action?: string } | null;
    const action = body?.action;

    if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_TOKEN is not set — add it on Vercel first.' },
        { status: 400 }
      );
    }

    if (action === 'set') {
      const origin = publicOrigin(req);
      if (isLocalOrigin(origin)) {
        return NextResponse.json(
          {
            error:
              'Telegram can only deliver to a public HTTPS address. Deploy to Vercel (or set NEXT_PUBLIC_SITE_URL), then connect again from the deployed site.',
          },
          { status: 400 }
        );
      }
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || '';
      const webhookUrl = `${origin}/api/telegram-webhook`;
      const res = await telegramRequest<unknown>('setWebhook', {
        url: webhookUrl,
        allowed_updates: ['callback_query'],
        ...(secret ? { secret_token: secret } : {}),
      });
      if (!res.ok) {
        const status = await buildStatus(req, true);
        return NextResponse.json(
          { error: `setWebhook failed: ${res.error}`, status },
          { status: 502 }
        );
      }
      // Telegram accepted the registration, but the address may still be a
      // redirect (custom domain non-www → www) — the buttons would not work.
      const redirect = await redirectTarget(webhookUrl);
      const status = await buildStatus(req, true);
      return NextResponse.json({
        success: true,
        ...(redirect
          ? {
              warning:
                `Registered ${webhookUrl}, but that address replies with a redirect to ${redirect} — ` +
                'Telegram never follows redirects, so the approve buttons would still fail. ' +
                `Open the console on the final address (${redirect}), connect again from there, ` +
                'or set NEXT_PUBLIC_SITE_URL to that final address on Vercel.',
            }
          : {}),
        status,
      });
    }

    if (action === 'delete') {
      const res = await telegramRequest<unknown>('deleteWebhook', { drop_pending_updates: false });
      if (!res.ok) {
        return NextResponse.json(
          { error: `deleteWebhook failed: ${res.error}` },
          { status: 502 }
        );
      }
      const status = await buildStatus(req, true);
      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json(
      { error: "Provide action 'set' or 'delete'." },
      { status: 400 }
    );
  } catch (err) {
    console.error('[admin/telegram]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
