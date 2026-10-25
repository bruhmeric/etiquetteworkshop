'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LyceumLogo } from './lyceum-logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EVENT } from '@/config/event';

const NAV = [
  { href: '#workshop', label: 'Workshop' },
  { href: '#details', label: 'Details' },
  { href: '#tickets', label: 'Tickets' },
];

export function SiteHeader({ onReserve }: { onReserve: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <Link
          href="#top"
          className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
          aria-label="Etiquette Essentials — back to top"
        >
          <LyceumLogo className="h-8 w-auto shrink-0 sm:h-9" />
          <span className="hidden min-w-0 flex-col leading-tight min-[420px]:flex">
            <span className="truncate font-display text-[14px] font-semibold tracking-[0.14em] text-foreground sm:text-[15px]">
              ETIQUETTE ESSENTIALS
            </span>
            <span className="hidden truncate text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:block">
              {EVENT.kind} · Lyceum Campus
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-brand"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Button
            onClick={onReserve}
            size="sm"
            className="h-9 rounded-full px-4 text-[11px] font-semibold uppercase tracking-[0.18em] sm:px-5"
          >
            Reserve
            <span className="sr-only sm:not-sr-only sm:ml-1.5">your seat</span>
          </Button>

          {/* mobile section nav */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full md:hidden"
                aria-label="Open section menu"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              {NAV.map((n) => (
                <DropdownMenuItem key={n.href} asChild>
                  <Link
                    href={n.href}
                    className="cursor-pointer text-xs font-medium uppercase tracking-[0.18em]"
                  >
                    {n.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
