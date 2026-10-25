'use client';

import { motion } from 'framer-motion';
import { CalendarDays, Clock3, MapPin, ExternalLink } from 'lucide-react';
import { SectionHeading } from './section-heading';
import { EVENT } from '@/config/event';
import type { LucideIcon } from 'lucide-react';

const CARDS: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
}[] = [
  {
    icon: CalendarDays,
    label: 'Date',
    value: EVENT.date.long,
    sub: 'One morning only',
  },
  {
    icon: Clock3,
    label: 'Time',
    value: EVENT.time.display,
    sub: `Doors open ${EVENT.time.doors ?? '8.30 AM'}`,
  },
  {
    icon: MapPin,
    label: 'Venue',
    value: EVENT.venue.hall,
    sub: `${EVENT.venue.campus}, ${EVENT.venue.city}`,
  },
];

export function Details() {
  return (
    <section
      id="details"
      className="relative border-y border-border/70 bg-secondary/45 py-20 sm:py-24"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="paper-grain absolute inset-0 opacity-[0.03] mix-blend-multiply dark:opacity-[0.04] dark:mix-blend-screen" />
      </div>
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="When & Where"
          title="Event details"
          description="One carefully arranged morning — mark your calendar and make your way to the hall."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: 0.1 * i }}
              className="rounded-xl border border-border bg-card p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand/60 hover:shadow-[0_18px_40px_-20px_rgba(28,45,90,0.22)]"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-brand">
                <c.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-brand">
                {c.label}
              </p>
              <p className="mt-2 font-display text-xl font-semibold leading-snug text-foreground">
                {c.value}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.sub}</p>
              {c.label === 'Venue' ? (
                <a
                  href={EVENT.venue.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline decoration-brand/60 underline-offset-4 transition-colors hover:text-brand hover:decoration-brand"
                >
                  Get directions
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 text-center text-[13px] tracking-wide text-muted-foreground"
        >
          Seats are limited and issued on a first-verified basis — early registration is
          encouraged.
        </motion.p>
      </div>
    </section>
  );
}
