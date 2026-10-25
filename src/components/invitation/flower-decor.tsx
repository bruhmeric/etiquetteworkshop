import { cn } from '@/lib/utils';

/**
 * Watercolor flower decorations extracted from the official workshop ticket
 * (transparent WebP art — safe on any background).
 * Purely decorative: aria-hidden, non-interactive, never focused.
 *
 * Plain <img> on purpose: decorative art with fully transparent backgrounds
 * gains nothing from the image optimizer, and intrinsic-ratio sizing via
 * responsive height classes is simpler without next/image's width/height
 * contract. Assets are pre-optimised WebP (~25-100 KB each).
 */
const VARIANTS = {
  /** Peony cluster + baby's breath — anchors to a bottom-left corner */
  peony: { src: '/flowers/peony-corner.webp', w: 585, h: 798, flip: false },
  /** Mirrored peony — anchors to a bottom-right corner */
  'peony-flip': { src: '/flowers/peony-corner.webp', w: 585, h: 798, flip: true },
  /** Dusty-rose foliage branch — bleeds off the right edge */
  branch: { src: '/flowers/branch-right.webp', w: 546, h: 798, flip: false },
  /** Mirrored branch — bleeds off the left edge */
  'branch-flip': { src: '/flowers/branch-left.webp', w: 546, h: 798, flip: false },
  /** Airy baby's-breath sprig — light divider ornament */
  sprig: { src: '/flowers/sprig-top.webp', w: 585, h: 335, flip: false },
} as const;

export type FlowerVariant = keyof typeof VARIANTS;

export function FlowerDecor({
  variant,
  className,
  priority = false,
}: {
  variant: FlowerVariant;
  className?: string;
  priority?: boolean;
}) {
  const v = VARIANTS[variant];
  return (
    <img
      src={v.src}
      alt=""
      width={v.w}
      height={v.h}
      aria-hidden="true"
      draggable={false}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn('pointer-events-none select-none', v.flip && '-scale-x-100', className)}
    />
  );
}
