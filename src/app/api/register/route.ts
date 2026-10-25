import { NextRequest, NextResponse } from 'next/server';
import { validateRegistration } from '@/lib/validation';
import { createRegistration, storageMode } from '@/lib/store';
import {
  sendTelegramMessage,
  buildNewRegistrationMessage,
  approveRejectKeyboard,
  telegramConfigured,
} from '@/lib/notify';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import type { RegisterSuccessResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Registrations per IP per window — generous for humans (even shared campus
 *  WiFi), limiting for scripts spamming slips + Telegram alerts. */
const REG_LIMIT = 10;
const REG_WINDOW_MS = 10 * 60 * 1000;

/** Base64 of the 4 MB slip cap plus JSON overhead — reject anything bigger
 *  before parsing, so a huge payload can never hit memory/JSON parsing. */
const MAX_BODY_CHARS = 6 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`register:${clientIp(req)}`, REG_LIMIT, REG_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Too many registrations from this network — please wait ${Math.max(
          1,
          Math.ceil(rl.retryAfterSec / 60)
        )} minute(s) and try again.`,
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json(
        { error: 'The uploaded slip is too large — please re-upload a smaller file (max 4 MB).' },
        { status: 413 }
      );
    }
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = null;
    }
    const parsed = validateRegistration(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const rec = await createRegistration(parsed.value);

    // Telegram alert is best-effort — a failed alert must not fail the registration.
    if (telegramConfigured()) {
      const tg = await sendTelegramMessage(
        buildNewRegistrationMessage(rec),
        approveRejectKeyboard(rec.id)
      );
      if (!tg.ok && !tg.skipped) {
        console.warn('[register] Telegram alert failed:', tg.error);
      }
    }

    const payload: RegisterSuccessResponse = {
      success: true,
      refCode: rec.reference_code,
      mode: storageMode(),
    };
    return NextResponse.json(payload);
  } catch (err) {
    // Log the details for the organizers; the public response stays generic.
    console.error('[register]', err);
    return NextResponse.json(
      { error: 'Something went wrong while saving your registration — please try again in a moment.' },
      { status: 500 }
    );
  }
}
