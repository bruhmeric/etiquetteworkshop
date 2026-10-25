'use client';

import { motion } from 'framer-motion';
import { Check, Banknote, CloudUpload, ShieldCheck, QrCode } from 'lucide-react';
import { SectionHeading } from './section-heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TICKET_CATEGORIES, EVENT } from '@/config/event';
import type { LucideIcon } from 'lucide-react';

const STEPS: { icon: LucideIcon; n: string; title: string; text: string }[] = [
  {
    icon: Banknote,
    n: '01',
    title: 'Pay the fee',
    text: 'Transfer the amount to the committee’s bank account — details are shown inside the registration form.',
  },
  {
    icon: CloudUpload,
    n: '02',
    title: 'Upload your slip',
    text: 'Fill in the form and attach a photo or PDF of your payment slip.',
  },
  {
    icon: ShieldCheck,
    n: '03',
    title: 'We verify',
    text: 'The organizing committee checks your submission — usually within a day.',
  },
  {
    icon: QrCode,
    n: '04',
    title: 'Receive your QR ticket',
    text: 'Your e-ticket arrives by email. Scan it at the entrance on the day.',
  },
];

const INCLUDES = [
  'Full three-hour workshop access',
  'Interactive sessions & practice activities',
  'QR e-ticket for entry',
];

export function Tickets({ onReserve }: { onReserve: (category?: string) => void }) {
  return (
    <section id="tickets" className="relative py-20 sm:py-24 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="Reserve Your Place"
          title="Tickets & Registration"
          description="Two simple categories. Pay, upload your slip, and your QR ticket arrives by email once verified."
        />

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {TICKET_CATEGORIES.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: 0.12 * i }}
              className="relative flex flex-col rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-brand/70 hover:shadow-[0_24px_50px_-24px_rgba(28,45,90,0.28)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground">{c.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-brand/50 bg-brand/10 text-[10px] font-medium uppercase tracking-[0.14em] text-brand"
                >
                  {c.note}
                </Badge>
              </div>

              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold tracking-tight text-foreground">
                  Rs.&thinsp;{c.price.toLocaleString('en-US')}
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  / person
                </span>
              </p>

              <ul className="mt-6 space-y-2.5 border-t border-border/80 pt-6">
                {INCLUDES.map((inc) => (
                  <li key={inc} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    {inc}
                  </li>
                ))}
                {c.requiresStudentId ? (
                  <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    Lyceum student ID required (e.g. BEd-PE-26-05-0015)
                  </li>
                ) : null}
              </ul>

              <Button
                onClick={() => onReserve(c.id)}
                className="mt-8 h-12 w-full rounded-full text-[11px] font-bold uppercase tracking-[0.22em]"
              >
                Register — {c.label.split(' ')[0] === 'Lyceum' ? 'student' : 'external'}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto mt-20 max-w-6xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center text-[11px] font-medium uppercase tracking-[0.35em] text-brand"
          >
            How registration works
          </motion.p>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: 0.08 * i }}
                className="relative"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl font-semibold text-brand/80">{s.n}</span>
                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  <s.icon className="h-5 w-5 text-brand" aria-hidden="true" />
                </div>
                <h4 className="mt-4 font-display text-lg font-semibold text-foreground">
                  {s.title}
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {EVENT.contact.email || EVENT.contact.phone ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            Having trouble?{' '}
            {EVENT.contact.email ? (
              <a
                className="text-foreground underline decoration-brand/60 underline-offset-4 hover:text-brand"
                href={`mailto:${EVENT.contact.email}`}
              >
                {EVENT.contact.email}
              </a>
            ) : null}
            {EVENT.contact.phone ? (
              <span> · {EVENT.contact.phone}</span>
            ) : null}
          </p>
        ) : (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            Having trouble? Speak to a BEd Intake 5 committee member at the campus.
          </p>
        )}
      </div>
    </section>
  );
}
