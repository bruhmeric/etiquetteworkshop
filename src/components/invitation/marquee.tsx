'use client';

const ITEMS = ['Confidence', 'Communication', 'Personal Presentation', 'Professional Etiquette'];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <span className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ITEMS.map((it) => (
        <span key={it} className="flex items-center">
          <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.35em] sm:text-[11px]">
            {it}
          </span>
          <span className="mx-7 text-brand" aria-hidden="true">✦</span>
        </span>
      ))}
    </span>
  );
}

export function Marquee() {
  return (
    <div
      className="border-y border-brand/30 bg-foreground text-background"
      role="presentation"
    >
      <div className="overflow-hidden py-3.5">
        <div className="animate-marquee flex w-max will-change-transform">
          <Row />
          <Row hidden />
        </div>
      </div>
    </div>
  );
}
