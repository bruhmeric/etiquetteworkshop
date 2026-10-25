'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function SectionHeading({
  kicker,
  title,
  description,
  align = 'center',
  className,
}: {
  kicker: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  const centered = align === 'center';
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn('max-w-2xl', centered ? 'mx-auto text-center' : 'text-left', className)}
    >
      <p className="text-brand text-[11px] font-medium uppercase tracking-[0.35em]">{kicker}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <div
        className={cn('mt-5 h-px w-14 bg-brand/80', centered && 'mx-auto')}
        aria-hidden="true"
      />
      {description ? (
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </motion.div>
  );
}
