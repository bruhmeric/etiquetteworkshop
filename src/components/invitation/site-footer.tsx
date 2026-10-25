'use client';

import Link from 'next/link';
import { ArrowUp, KeyRound, Mail, Phone } from 'lucide-react';
import { LyceumLogo } from './lyceum-logo';
import { FlowerDecor } from './flower-decor';
import { EVENT } from '@/config/event';

export function SiteFooter({ onOpenConsole }: { onOpenConsole: () => void }) {
  return (
    <footer className="relative mt-auto overflow-hidden bg-[#3b2029] text-white">
      <FlowerDecor
        variant="sprig"
        className="absolute -top-2 right-4 h-24 opacity-70 sm:right-10 sm:h-32 sm:opacity-90 [mask-image:linear-gradient(to_top,transparent,black_30%)]"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
            <div className="flex items-center gap-3">
              <LyceumLogo tone="white" className="h-10 w-auto" />
              <div className="leading-tight">
                <p className="font-display text-base font-semibold tracking-[0.16em]">
                  ETIQUETTE ESSENTIALS
                </p>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-70">{EVENT.kind}</p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed opacity-85">
              {EVENT.organizer} — {EVENT.date.long}, {EVENT.time.display}.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm opacity-90 md:justify-start">
              {EVENT.contact.email ? (
                <a
                  className="inline-flex items-center gap-1.5 underline decoration-transparent underline-offset-4 transition hover:decoration-white"
                  href={`mailto:${EVENT.contact.email}`}
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {EVENT.contact.email}
                </a>
              ) : null}
              {EVENT.contact.phone ? (
                <a
                  className="inline-flex items-center gap-1.5 underline decoration-transparent underline-offset-4 transition hover:decoration-white"
                  href={`tel:${EVENT.contact.phone.replace(/\s+/g, '')}`}
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {EVENT.contact.phone}
                </a>
              ) : null}
            </div>
          </div>

          <nav className="flex flex-col items-center gap-3 text-sm md:items-end" aria-label="Footer">
            <Link
              href="#top"
              className="inline-flex items-center gap-1.5 underline decoration-transparent underline-offset-4 transition hover:decoration-white"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              Back to top
            </Link>
            <button
              onClick={onOpenConsole}
              className="inline-flex items-center gap-1.5 underline decoration-transparent underline-offset-4 transition hover:decoration-white"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              Organizer console
            </button>
            <p className="pt-1 text-xs opacity-60">
              © 2027 Etiquette Essentials · An Upskill Workshop
            </p>
          </nav>
        </div>
      </div>
    </footer>
  );
}
