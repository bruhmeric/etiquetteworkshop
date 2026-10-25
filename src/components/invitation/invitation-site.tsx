'use client';

import { useState } from 'react';
import { SiteHeader } from './site-header';
import { Hero } from './hero';
import { Marquee } from './marquee';
import { About } from './about';
import { Details } from './details';
import { Tickets } from './tickets';
import { SiteFooter } from './site-footer';
import { RegisterDialog } from './register-dialog';
import type { Category } from '@/config/event';

export function InvitationSite({ onOpenConsole }: { onOpenConsole: () => void }) {
  const [regOpen, setRegOpen] = useState(false);
  const [regCategory, setRegCategory] = useState<Category | undefined>(undefined);

  function openRegister(category?: string) {
    setRegCategory((category as Category) ?? undefined);
    setRegOpen(true);
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader onReserve={() => openRegister()} />
      <main className="flex-1">
        <Hero onReserve={() => openRegister()} />
        <Marquee />
        <About />
        <Details />
        <Tickets onReserve={openRegister} />
      </main>
      <SiteFooter onOpenConsole={onOpenConsole} />
      <RegisterDialog
        open={regOpen}
        onOpenChange={setRegOpen}
        initialCategory={regCategory}
      />
    </div>
  );
}
