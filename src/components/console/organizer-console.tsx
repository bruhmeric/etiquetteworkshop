'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Info,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  ScanLine,
  Send,
  ShieldAlert,
  MailX,
  MailCheck,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { LyceumLogo } from '@/components/invitation/lyceum-logo';
import { Dashboard, type ConsoleMeta } from './dashboard';
import { Scanner } from './scanner';

const SESSION_KEY = 'ee-admin-key';
const MAX_TRIES = 3;

export function OrganizerConsole({ onExit }: { onExit: () => void }) {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  /** Wrong attempts this visit — the form locks after MAX_TRIES. */
  const [attempts, setAttempts] = useState(0);
  const [meta, setMeta] = useState<ConsoleMeta | null>(null);

  const lockedOut = attempts >= MAX_TRIES;

  /** Verify a candidate key against the (protected) admin API. */
  const verify = useCallback(
    async (key: string): Promise<'ok' | 'bad' | 'locked'> => {
      try {
        const res = await fetch('/api/admin/registrations', {
          headers: { 'x-admin-key': key },
        });
        if (res.ok) return 'ok';
        if (res.status === 429) return 'locked';
        return 'bad';
      } catch {
        return 'bad';
      }
    },
    []
  );

  // Auto-login when a key from this session is still valid.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved =
        typeof window !== 'undefined' ? window.sessionStorage.getItem(SESSION_KEY) : null;
      if (saved && (await verify(saved)) === 'ok') {
        if (!cancelled) {
          setAdminKey(saved);
          setAuthed(true);
        }
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [verify]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (lockedOut) return;
    if (!pw.trim()) {
      setPwError('Enter the organizer password.');
      return;
    }
    setUnlocking(true);
    setPwError(null);
    const result = await verify(pw);
    if (result === 'ok') {
      window.sessionStorage.setItem(SESSION_KEY, pw);
      setAdminKey(pw);
      setAuthed(true);
      setPw('');
      setAttempts(0);
    } else if (result === 'locked') {
      setPwError('Too many incorrect attempts — the console is locked. Wait a few minutes, then reload the page.');
      setAttempts(MAX_TRIES);
    } else {
      const n = attempts + 1;
      setAttempts(n);
      setPwError(
        n >= MAX_TRIES
          ? 'Too many incorrect attempts — the console is locked. Wait a few minutes, then reload the page.'
          : `Incorrect password — please check with the organizing committee. ${
              MAX_TRIES - n
            } ${MAX_TRIES - n === 1 ? 'try' : 'tries'} left.`
      );
    }
    setUnlocking(false);
  }

  function lockConsole() {
    window.sessionStorage.removeItem(SESSION_KEY);
    setAdminKey('');
    setAuthed(false);
    setMeta(null);
    setPw('');
    setPwError(null);
    setAttempts(0);
  }

  /* ── password gate ─────────────────────────────────────────── */
  if (!authed) {
    return (
      <div className="flex min-h-svh flex-col bg-secondary/40">
        <header className="border-b border-border/70 bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExit}
              className="h-9 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Invitation
            </Button>
            <span className="h-6 w-px bg-border" aria-hidden="true" />
            <LyceumLogo className="h-7 w-auto shrink-0" />
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[0_30px_70px_-30px_rgba(64,36,46,0.35)]">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-brand">
                <LockKeyhole className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">
                Organizer console
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This area is password-protected. Enter the organizer password shared with the
                BEd Intake 5 committee.
              </p>

              <form className="mt-6 space-y-3 text-left" onSubmit={unlock}>
                <label htmlFor="console-pw" className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Password
                </label>
                <Input
                  id="console-pw"
                  type="password"
                  value={pw}
                  disabled={lockedOut}
                  onChange={(e) => {
                    setPw(e.target.value);
                    if (!lockedOut) setPwError(null);
                  }}
                  placeholder="Organizer password"
                  autoComplete="current-password"
                  className="h-11"
                />
                {pwError ? (
                  <p role="alert" className="text-xs text-destructive">
                    {pwError}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={unlocking || checking || lockedOut}
                  className="h-11 w-full rounded-full"
                >
                  {unlocking ? 'Verifying…' : 'Unlock console'}
                </Button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── authenticated console ──────────────────────────────────── */
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="h-9 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Invitation
          </Button>
          <span className="h-6 w-px bg-border" aria-hidden="true" />
          <LyceumLogo className="hidden h-7 w-auto shrink-0 min-[420px]:block" />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-sm font-semibold tracking-[0.12em] text-foreground">
              ETIQUETTE ESSENTIALS
            </p>
            <p className="hidden text-[10px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
              Organizer console
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {meta ? (
              <>
                <Badge
                  variant="outline"
                  className={`hidden rounded-full text-[10px] font-medium uppercase tracking-[0.14em] sm:inline-flex ${
                    meta.mode === 'demo'
                      ? 'border-warning/50 bg-warning/10 text-warning'
                      : 'border-success/50 bg-success/10 text-success'
                  }`}
                >
                  {meta.mode === 'demo' ? 'Demo mode' : 'Supabase live'}
                </Badge>
                <Badge
                  variant="outline"
                  className={`hidden rounded-full text-[10px] font-medium uppercase tracking-[0.14em] md:inline-flex ${
                    meta.telegramConfigured
                      ? 'border-success/50 bg-success/10 text-success'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {meta.telegramConfigured ? <Send className="mr-1 h-3 w-3" /> : <MailX className="mr-1 h-3 w-3" />}
                  {meta.telegramConfigured ? 'Telegram' : 'No Telegram'}
                </Badge>
                <Badge
                  variant="outline"
                  className={`hidden rounded-full text-[10px] font-medium uppercase tracking-[0.14em] md:inline-flex ${
                    meta.emailConfigured
                      ? 'border-success/50 bg-success/10 text-success'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {meta.emailConfigured ? <MailCheck className="mr-1 h-3 w-3" /> : <MailX className="mr-1 h-3 w-3" />}
                  {meta.emailConfigured ? 'Resend' : 'No Resend'}
                </Badge>
              </>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={lockConsole}
              className="h-9 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Lock console</span>
              <span className="sr-only sm:hidden">Lock console</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {meta?.mode === 'demo' ? (
        <div className="border-b border-warning/30 bg-warning/10">
          <p className="mx-auto flex w-full max-w-6xl items-start gap-2.5 px-4 py-2.5 text-[13px] leading-relaxed text-foreground sm:px-6">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              <span className="font-medium">Demo mode</span> — data lives in memory and resets on
              restart. Set the <code className="font-mono text-xs">SUPABASE</code>,{' '}
              <code className="font-mono text-xs">TELEGRAM</code> and{' '}
              <code className="font-mono text-xs">RESEND</code> environment variables on Vercel to
              go live (see the README).
            </span>
          </p>
        </div>
      ) : null}

      {meta?.usingDefaultKey && meta?.mode === 'supabase' ? (
        <div className="border-b border-destructive/30 bg-destructive/10">
          <p className="mx-auto flex w-full max-w-6xl items-start gap-2.5 px-4 py-2.5 text-[13px] leading-relaxed text-foreground sm:px-6">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <span>
              <span className="font-medium">Default password in use</span> — the console is
              protected by the publicly documented default because{' '}
              <code className="font-mono text-xs">ADMIN_KEY</code> is not set. Set your own
              password in Vercel → Settings → Environment Variables, then redeploy.
            </span>
          </p>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Tabs defaultValue="dashboard">
          <TabsList className="rounded-full bg-secondary p-1">
            <TabsTrigger
              value="dashboard"
              className="rounded-full px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <LayoutDashboard className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="scanner"
              className="rounded-full px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <ScanLine className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Entrance scanner
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-6">
            <Dashboard adminKey={adminKey} onMeta={setMeta} />
          </TabsContent>
          <TabsContent value="scanner" className="mt-6">
            <Scanner demo={meta?.mode === 'demo'} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t border-border/70 bg-secondary/30">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          Etiquette Essentials · Organizer console — approvals also arrive in the Telegram
          admin group; this dashboard is the web fallback.
        </p>
      </footer>
    </div>
  );
}
