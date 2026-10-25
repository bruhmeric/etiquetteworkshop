'use client';

import { motion } from 'framer-motion';
import { Feather, MessagesSquare, Shirt, Handshake } from 'lucide-react';
import { SectionHeading } from './section-heading';
import { FlowerDecor } from './flower-decor';
import { EVENT } from '@/config/event';
import type { LucideIcon } from 'lucide-react';

/** The four areas named in the invitation message — nothing more. */
const AREAS: { icon: LucideIcon; label: string }[] = [
  { icon: Feather, label: 'Confidence' },
  { icon: MessagesSquare, label: 'Communication Skills' },
  { icon: Shirt, label: 'Personal Presentation' },
  { icon: Handshake, label: 'Professional Etiquette' },
];

export function About() {
  return (
    <section id="workshop" className="relative overflow-hidden py-20 sm:py-24 lg:py-28">
      <FlowerDecor
        variant="sprig"
        className="absolute -right-8 top-10 hidden h-40 -rotate-6 opacity-50 sm:block lg:h-48 [mask-image:linear-gradient(to_top,transparent,black_30%)]"
      />
      <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-6">
        <SectionHeading
          align="center"
          kicker="The Workshop"
          title="About the workshop"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-center text-[15px] leading-[1.9] text-muted-foreground"
        >
          {EVENT.description}
        </motion.p>

        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          {AREAS.map((a) => (
            <li
              key={a.label}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-6 text-center"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-brand">
                <a.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-[13px] font-medium leading-snug text-foreground">
                {a.label}
              </span>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
