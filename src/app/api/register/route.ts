import { NextRequest, NextResponse } from 'next/server';
import { validateRegistration } from '@/lib/validation';
import { createRegistration, storageMode } from '@/lib/store';
import {
  sendTelegramMessage,
  buildNewRegistrationMessage,
  approveRejectKeyboard,
  telegramConfigured,
} from '@/lib/notify';
import type { RegisterSuccessResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
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
    console.error('[register]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
