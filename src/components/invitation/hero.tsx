'use client';

import { motion, type Variants } from 'framer-motion';
import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EVENT } from '@/config/event';
import { LyceumLogo } from './lyceum-logo';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

function Ornament() {
  return (
    <span className="flex items-center justify-center gap-3" aria-hidden="true">
      <span className="h-px w-14 bg-brand/70 sm:w-20" />
      <span className="h-1.5 w-1.5 rotate-45 bg-brand" />
      <span className="h-px w-14 bg-brand/70 sm:w-20" />
    </span>
  );
}

export function Hero({ onReserve }: { onReserve: () => void }) {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* decorative field */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/70 via-background to-background" />
        <div className="paper-grain absolute inset-0 opacity-[0.035] mix-blend-multiply dark:opacity-[0.05] dark:mix-blend-screen" />
        <div className="absolute -right-24 top-1/2 hidden -translate-y-1/2 select-none font-display text-[22rem] font-bold leading-none tracking-tighter text-foreground/[0.04] lg:block dark:text-foreground/[0.05]">
          EE
        </div>
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-brand/[0.07] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl flex-col items-center justify-center px-4 py-16 sm:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative w-full max-w-3xl"
        >
          {/* the invitation card */}
          <div className="relative rounded-lg border border-brand/45 bg-card/95 shadow-[0_1px_2px_rgba(28,45,90,0.05),0_30px_80px_-24px_rgba(28,45,90,0.18)] backdrop-blur-sm dark:shadow-[0_30px_80px_-24px_rgba(0,0,0,0.6)]">
            <div className="pointer-events-none absolute inset-[7px] rounded-[5px] border border-brand/40" aria-hidden="true">
              <span className="absolute -left-[1px] -top-[1px] h-4 w-4 border-l-2 border-t-2 border-brand" />
              <span className="absolute -right-[1px] -top-[1px] h-4 w-4 border-r-2 border-t-2 border-brand" />
              <span className="absolute -bottom-[1px] -left-[1px] h-4 w-4 border-b-2 border-l-2 border-brand" />
              <span className="absolute -bottom-[1px] -right-[1px] h-4 w-4 border-b-2 border-r-2 border-brand" />
            </div>

            <div className="relative px-6 py-12 text-center sm:px-12 sm:py-16 md:px-16">
              <motion.div variants={item} className="flex justify-center">
                <LyceumLogo className="h-10 w-auto sm:h-12" />
              </motion.div>

              <motion.p
                variants={item}
                className="mt-6 text-[10px] font-medium uppercase tracking-[0.35em] text-brand sm:mt-7 sm:text-[11px]"
              >
                BEd Intake 5 presents
              </motion.p>

              <motion.div variants={item} className="mt-7">
                <p className="font-serif text-[1.75rem] italic leading-snug text-muted-foreground sm:text-4xl">
                  {EVENT.inviteLead}
                </p>
              </motion.div>

              <motion.div variants={item} className="mt-7">
                <Ornament />
              </motion.div>

              <motion.h1
                variants={item}
                className="mt-7 font-display text-[2.6rem] font-bold leading-[1.04] tracking-[0.05em] text-foreground sm:text-6xl md:text-[4.6rem]"
              >
                ETIQUETTE
                <br className="sm:hidden" />
                {' '}ESSENTIALS
              </motion.h1>

              <motion.p
                variants={item}
                className="mx-auto mt-6 max-w-xl text-[11px] font-medium uppercase leading-[2] tracking-[0.24em] text-muted-foreground sm:text-xs"
              >
                {EVENT.tagline}
              </motion.p>

              <motion.div variants={item} className="mx-auto mt-8 h-px w-16 bg-brand/80" aria-hidden="true" />

              <motion.dl
                variants={item}
                className="mx-auto mt-8 grid max-w-2xl gap-y-4 text-foreground sm:grid-cols-3 sm:gap-x-6 sm:divide-x sm:divide-border/80"
              >
                <div className="flex items-center justify-center gap-2.5 sm:px-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <dt className="sr-only">Date</dt>
                  <dd className="font-display text-[15px] font-semibold sm:text-base">
                    {EVENT.date.long}
                  </dd>
                </div>
                <div className="flex items-center justify-center gap-2.5 sm:px-2">
                  <Clock3 className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <dt className="sr-only">Time</dt>
                  <dd className="font-display text-[15px] font-semibold sm:text-base">
                    {EVENT.time.display}
                  </dd>
                </div>
                <div className="flex items-center justify-center gap-2.5 sm:px-2">
                  <MapPin className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <dt className="sr-only">Venue</dt>
                  <dd className="font-display text-[15px] font-semibold sm:text-base">
                    {EVENT.venue.full}
                  </dd>
                </div>
              </motion.dl>

              <motion.div
                variants={item}
                className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Button
                  onClick={onReserve}
                  className="group h-12 rounded-full bg-brand px-8 text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_10px_30px_-10px_rgba(38,90,162,0.55)] transition-all hover:bg-brand-strong hover:shadow-[0_14px_36px_-10px_rgba(38,90,162,0.65)] sm:min-w-[220px]"
                >
                  Reserve your seat
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-border bg-transparent px-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-brand hover:bg-brand/10 hover:text-foreground sm:min-w-[220px]"
                  asChild
                >
                  <a href="#workshop">Workshop details</a>
                </Button>
              </motion.div>
            </div>
          </div>

          <motion.p
            variants={item}
            className="mt-7 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/80"
          >
            {EVENT.organizer}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
