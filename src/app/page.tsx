'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { InvitationSite } from '@/components/invitation/invitation-site';
import { OrganizerConsole } from '@/components/console/organizer-console';

export default function Home() {
  const [view, setView] = useState<'invitation' | 'console'>('invitation');

  function go(target: 'invitation' | 'console') {
    setView(target);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {view === 'invitation' ? (
        <motion.div
          key="invitation"
          className="flex min-h-svh flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <InvitationSite onOpenConsole={() => go('console')} />
        </motion.div>
      ) : (
        <motion.div
          key="console"
          className="flex min-h-svh flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <OrganizerConsole onExit={() => go('invitation')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
