'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BadgeCheck,
  BadgeX,
  Ban,
  Clock3,
  Copy,
  Download,
  FileText,
  Hourglass,
  ImagePlus,
  Link2,
  Loader2,
  Mail,
  Phone,
  QrCode,
  ScanFace,
  Send,
  ShieldAlert,
  Unlink,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TicketViewer, SlipViewer, isPdfSlipUrl } from './dialogs';
import { timeAgo, money } from '@/lib/time';
import type {
  ActionResponse,
  AdminListResponse,
  Registration,
  TelegramStatusResponse,
} from '@/lib/types';

export interface ConsoleMeta {
  mode: 'demo' | 'supabase';
  telegramConfigured: boolean;
  emailConfigured: boolean;
  usingDefaultKey: boolean;
  counts: AdminListResponse['counts'];
}

export function Dashboard({
  adminKey,
  onMeta,
}: {
  adminKey: string;
  onMeta: (m: ConsoleMeta) => void;
}) {
  const [data, setData] = useState<AdminListResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ticket, setTicket] = useState<{
    rec: Registration;
    qrDataUrl: string;
    note?: string;
  } | null>(null);
  const [slip, setSlip] = useState<{ name: string; url: string } | null>(null);
  const [tg, setTg] = useState<TelegramStatusResponse | null>(null);
  const [tgBusy, setTgBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/registrations', {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.status === 401) {
        setLoadError('Session locked — please reopen the console and sign in again.');
        return;
      }
      const json = (await res.json()) as AdminListResponse & { error?: string };
      if (!res.ok) {
        setLoadError(json.error || 'Failed to load registrations.');
        return;
      }
      setLoadError(null);
      setData(json);
      onMeta({
        mode: json.mode,
        telegramConfigured: json.telegramConfigured,
        emailConfigured: json.emailConfigured,
        usingDefaultKey: json.usingDefaultKey,
        counts: json.counts,
      });
    } catch {
      setLoadError('Network error — could not reach the server.');
    }
  }, [adminKey, onMeta]);

  useEffect(() => {
    fetchList();
    const id = setInterval(fetchList, 5000);
    return () => clearInterval(id);
  }, [fetchList]);

  const fetchTg = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/telegram', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) return;
      setTg((await res.json()) as TelegramStatusResponse);
    } catch {
      /* status card simply stays hidden on network errors */
    }
  }, [adminKey]);

  useEffect(() => {
    fetchTg();
  }, [fetchTg]);

  /** Fetches the password-protected report endpoint and saves it as a file. */
  async function downloadReport() {
    setReportBusy(true);
    try {
      const res = await fetch('/api/admin/report', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(json?.error || 'Could not generate the report.');
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const name =
        cd.match(/filename="([^"]+)"/)?.[1] ||
        `etiquette-essentials-report-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success('Report downloaded — full participant details as CSV.');
    } catch {
      toast.error('Network error — report not downloaded.');
    } finally {
      setReportBusy(false);
    }
  }

  async function tgAction(action: 'set' | 'delete') {
    setTgBusy(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        warning?: string;
        status?: TelegramStatusResponse;
      };
      if (json.status) setTg(json.status);
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Telegram action failed.', { duration: 10000 });
        return;
      }
      if (json.warning) {
        toast.warning(json.warning, { duration: 14000 });
        return;
      }
      toast.success(
        action === 'set'
          ? 'Connected — the Telegram approve buttons are now live.'
          : 'Webhook removed — button presses will no longer reach this site.'
      );
      fetchTg();
    } catch {
      toast.error('Network error — could not reach Telegram.');
    } finally {
      setTgBusy(false);
    }
  }

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    []
  );

  function askReject(id: string) {
    setConfirmReject(id);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmReject(null), 4000);
  }

  async function doAction(rec: Registration, action: 'approve' | 'reject') {
    if (action === 'reject' && confirmReject !== rec.id) {
      askReject(rec.id);
      return;
    }
    setConfirmReject(null);
    setActionBusy(rec.id);
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ id: rec.id, action, adminName: 'Organizer (console)' }),
      });
      const json = (await res.json()) as ActionResponse & { error?: string };
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Action failed.');
        return;
      }
      if (action === 'approve') {
        const note = json.emailSent
          ? `✓ Ticket emailed to ${rec.email}`
          : json.emailSkipped
            ? 'Email sending is off (no RESEND_API_KEY). This is the ticket that would be emailed — in production it is sent automatically.'
            : 'Email failed to send — the ticket is shown below.';
        setTicket({ rec, qrDataUrl: json.qrDataUrl ?? '', note });
        toast.success(`Approved — ${rec.full_name}`);
      } else {
        toast(`Rejected — ${rec.full_name}`);
      }
      fetchList();
    } catch {
      toast.error('Network error — action not applied.');
    } finally {
      setActionBusy(null);
    }
  }

  async function viewTicket(rec: Registration) {
    setActionBusy(rec.id);
    try {
      // Idempotent approve — returns the existing ticket without re-emailing.
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ id: rec.id, action: 'approve', adminName: 'Organizer (console)' }),
      });
      const json = (await res.json()) as ActionResponse & { error?: string };
      if (res.ok && json.success && json.qrDataUrl) {
        setTicket({ rec, qrDataUrl: json.qrDataUrl });
      } else {
        toast.error(json.error || 'Could not load the ticket.');
      }
    } finally {
      setActionBusy(null);
    }
  }

  /* ── loading / errors ── */
  if (!data) {
    if (loadError) {
      return (
        <div
          role="alert"
          className="mx-auto max-w-md rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive"
        >
          {loadError}
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" aria-hidden="true" />
        Loading registrations…
      </div>
    );
  }

  const pending = data.registrations.filter((r) => r.status === 'pending');
  const processed = data.registrations.filter((r) => r.status !== 'pending');
  const c = data.counts;

  return (
    <div className="space-y-8">
      {/* Telegram webhook status */}
      <TelegramCard tg={tg} busy={tgBusy} onAction={tgAction} />

      {/* stats + report download */}
      <section aria-label="Overview and reports">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Overview
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadReport}
            disabled={reportBusy}
            className="h-9 rounded-full px-4 text-xs"
          >
            {reportBusy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Download report (CSV)
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Pending" value={c.pending} sub="awaiting review" icon={<Hourglass className="h-5 w-5" />} tone="brand" />
          <Stat
            label="Approved"
            value={c.approved}
            sub={money(c.revenue)}
            icon={<BadgeCheck className="h-5 w-5" />}
            tone="success"
          />
          <Stat label="Checked in" value={c.checkedIn} sub={`of ${c.approved} approved`} icon={<ScanFace className="h-5 w-5" />} tone="success" />
          <Stat label="Rejected" value={c.rejected} sub="declined slips" icon={<Ban className="h-5 w-5" />} tone="danger" />
        </div>
      </section>

      {/* pending */}
      <section aria-label="Awaiting approval">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Awaiting approval
          <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
            {pending.length}
          </span>
        </h3>
        {pending.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 py-14 text-center">
            <Hourglass className="h-6 w-6 text-brand" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              No pending registrations — new submissions appear here instantly.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:p-5"
              >
                <button
                  onClick={() => setSlip({ name: r.full_name, url: r.slip_url })}
                  className="group relative h-20 w-20 shrink-0 self-start overflow-hidden rounded-lg border border-border transition hover:border-brand sm:self-center"
                  aria-label={`View payment slip from ${r.full_name}`}
                >
                  {r.slip_url && isPdfSlipUrl(r.slip_url) ? (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-secondary text-brand">
                      <FileText className="h-6 w-6" aria-hidden="true" />
                      <span className="text-[9px] font-semibold uppercase tracking-[0.18em]">
                        PDF
                      </span>
                    </span>
                  ) : r.slip_url ? (
                    <img
                      src={r.slip_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
                      <ImagePlus className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-display text-lg font-semibold leading-tight text-foreground">
                      {r.full_name}
                    </p>
                    <Badge variant="outline" className="border-brand/40 bg-brand/10 text-[10px] uppercase tracking-[0.14em] text-brand">
                      {r.category}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">{money(r.amount)}</Badge>
                  </div>
                  <div className="mt-1.5 grid gap-x-5 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {r.email}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {r.phone}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <Wallet className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {r.reference_code} · {r.ticket_code}
                    </span>
                    {r.student_id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <BadgeCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                        ID {r.student_id}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                    <Clock3 className="h-3 w-3" aria-hidden="true" />
                    {timeAgo(r.created_at)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <Button
                    size="sm"
                    onClick={() => doAction(r, 'approve')}
                    disabled={actionBusy === r.id}
                    className="h-10 flex-1 rounded-full px-5 sm:w-32"
                  >
                    {actionBusy === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <>
                        <BadgeCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={confirmReject === r.id ? 'destructive' : 'outline'}
                    onClick={() => doAction(r, 'reject')}
                    disabled={actionBusy === r.id}
                    className="h-10 flex-1 rounded-full px-5 sm:w-32"
                  >
                    <BadgeX className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {confirmReject === r.id ? 'Sure?' : 'Reject'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* processed */}
      <section aria-label="Processed registrations">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Processed
          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {processed.length}
          </span>
        </h3>
        {processed.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nothing processed yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {processed.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    r.status === 'approved' ? 'bg-success' : 'bg-destructive'
                  }`}
                  aria-hidden="true"
                />
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {r.full_name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {r.category} · {money(r.amount)}
                  </span>
                </p>
                {r.checked_in ? (
                  <Badge className="rounded-full bg-success/15 text-[10px] uppercase tracking-[0.12em] text-success hover:bg-success/15" >
                    Scanned ✓
                  </Badge>
                ) : null}
                <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                  {r.ticket_code}
                </span>
                <span className="text-[11px] text-muted-foreground/80">{timeAgo(r.created_at)}</span>
                {r.status === 'approved' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => viewTicket(r)}
                    disabled={actionBusy === r.id}
                    className="h-8 rounded-full px-3 text-xs text-foreground hover:text-brand"
                  >
                    {actionBusy === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <QrCode className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Ticket
                  </Button>
                ) : (
                  <Badge variant="outline" className="rounded-full border-destructive/40 text-[10px] uppercase tracking-[0.12em] text-destructive">
                    Rejected
                  </Badge>
                )}
                <button
                  onClick={() => setSlip({ name: r.full_name, url: r.slip_url })}
                  className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border transition hover:border-brand"
                  aria-label={`View payment slip from ${r.full_name}`}
                >
                  {r.slip_url && isPdfSlipUrl(r.slip_url) ? (
                    <span className="flex h-full w-full items-center justify-center bg-secondary text-brand">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                  ) : r.slip_url ? (
                    <img src={r.slip_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TicketViewer ticket={ticket} onClose={() => setTicket(null)} />
      <SlipViewer slip={slip} onClose={() => setSlip(null)} />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  tone: 'brand' | 'success' | 'danger';
}) {
  const toneCls =
    tone === 'brand'
      ? 'border-brand/40 bg-brand/10 text-brand'
      : tone === 'success'
        ? 'border-success/40 bg-success/10 text-success'
        : 'border-destructive/40 bg-destructive/10 text-destructive';
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {label}
        </p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${toneCls}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-4xl font-semibold leading-none text-foreground">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

/**
 * Telegram approve-button health card. Registration alerts are pushed TO
 * Telegram with a simple API call, but the Approve / Reject buttons only work
 * once a webhook links Telegram back to this site — this card shows that
 * status and connects it with one click.
 */
function TelegramCard({
  tg,
  busy,
  onAction,
}: {
  tg: TelegramStatusResponse | null;
  busy: boolean;
  onAction: (action: 'set' | 'delete') => void;
}) {
  if (!tg || !tg.tokenConfigured) return null; // header badge says "No Telegram"

  const connected = Boolean(tg.webhook && tg.webhook.url === tg.expectedUrl);
  const pointingElsewhere = Boolean(tg.webhook && tg.webhook.url !== tg.expectedUrl);
  // The registered webhook address replies with a redirect (e.g. custom
  // domain non-www → www) — Telegram never follows redirects, so every
  // Approve / Reject press fails with "308 Permanent Redirect".
  const redirectProblem = Boolean(
    tg.webhookRedirect ||
      (tg.webhook?.last_error_message && /308|redirect/i.test(tg.webhook.last_error_message))
  );
  const manualCmd = `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=${tg.expectedUrl}`;

  return (
    <section
      aria-label="Telegram approve buttons"
      className={`overflow-hidden rounded-xl border bg-card ${
        connected && !redirectProblem
          ? 'border-success/40'
          : redirectProblem
            ? 'border-destructive/50'
            : 'border-warning/50'
      }`}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Send className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">
              Telegram approve buttons
            </h3>
            {connected && !redirectProblem ? (
              <Badge variant="outline" className="rounded-full border-success/50 bg-success/10 text-[10px] font-medium uppercase tracking-[0.14em] text-success">
                <Link2 className="mr-1 h-3 w-3" aria-hidden="true" />
                Connected
              </Badge>
            ) : redirectProblem ? (
              <Badge variant="outline" className="rounded-full border-destructive/50 bg-destructive/10 text-[10px] font-medium uppercase tracking-[0.14em] text-destructive">
                <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
                Broken — address redirects
              </Badge>
            ) : pointingElsewhere ? (
              <Badge variant="outline" className="rounded-full border-warning/50 bg-warning/10 text-[10px] font-medium uppercase tracking-[0.14em] text-warning">
                <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
                Points to another site
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full border-warning/50 bg-warning/10 text-[10px] font-medium uppercase tracking-[0.14em] text-warning">
                <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
                Not connected
              </Badge>
            )}
            {tg.botUsername ? (
              <span className="text-xs text-muted-foreground">@{tg.botUsername}</span>
            ) : null}
          </div>

          {connected ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Button presses in the Telegram group are delivered to this site and approvals
              send the QR ticket automatically.
              {tg.webhook?.pending_update_count
                ? ` ${tg.webhook.pending_update_count} update(s) still queued.`
                : ''}
            </p>
          ) : (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Registration alerts arrive in Telegram, but the Approve / Reject buttons do
              nothing yet — Telegram has no way to deliver the button press back to this
              site. Connect once (below) and the buttons go live. Until then, approve from
              this dashboard.
            </p>
          )}

          {pointingElsewhere && tg.webhook ? (
            <p className="mt-1.5 break-all text-[11px] text-muted-foreground">
              Currently pointing at <span className="font-mono">{tg.webhook.url}</span>
            </p>
          ) : null}

          {!tg.secretConfigured ? (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-warning">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-medium">Webhook secret not set</span> — without{' '}
                <span className="font-mono">TELEGRAM_WEBHOOK_SECRET</span> on Vercel, anyone who
                discovers the webhook address could forge an approval. Set the secret, then press
                Connect again (it is sent automatically).
              </span>
            </p>
          ) : null}

          {tg.webhook?.last_error_message ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-destructive">
              Last delivery error: {tg.webhook.last_error_message}
            </p>
          ) : null}
          {redirectProblem ? (
            <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-destructive">
                The webhook address replies with a redirect — Telegram never
                follows redirects, so button presses cannot be delivered.
              </p>
              {tg.webhookRedirect ? (
                <p className="mt-1 break-all text-[11px] leading-relaxed text-muted-foreground">
                  Registered <span className="font-mono">{tg.webhook?.url}</span>
                  {tg.webhookRedirect !== tg.webhook?.url ? (
                    <>
                      {' '}
                      forwards to <span className="font-mono">{tg.webhookRedirect}</span>
                    </>
                  ) : null}
                  .
                </p>
              ) : null}
              <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                This usually happens with a custom domain where one address
                forwards to the other (for example the non-www address
                forwarding to the www one). Fix: open this console on the final
                address your browser lands on (or set{' '}
                <span className="font-mono">NEXT_PUBLIC_SITE_URL</span> to it
                on Vercel), then press Connect again.
              </p>
            </div>
          ) : null}
          {tg.error ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-destructive">{tg.error}</p>
          ) : null}
          {tg.isLocal ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              This is the local preview — Telegram can only reach the public Vercel URL. Open
              the console on your deployed site and connect there.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            onClick={() => onAction('set')}
            disabled={busy || tg.isLocal}
            className="h-9 rounded-full px-4 text-xs"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {connected ? 'Re-connect' : 'Connect buttons'}
              </>
            )}
          </Button>
          {connected ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAction('delete')}
              disabled={busy}
              className="h-9 rounded-full px-3 text-xs text-muted-foreground hover:text-destructive"
            >
              <Unlink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {!connected ? (
        <details className="border-t border-border/70 bg-secondary/30 px-5 py-3">
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
            Prefer to do it manually?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Open this URL in any browser (replace{' '}
            <span className="font-mono">&lt;YOUR_BOT_TOKEN&gt;</span> with the token BotFather
            gave you) — it registers the webhook:
          </p>
          <div className="mt-2 flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-card px-3 py-2 font-mono text-[11px] text-foreground">
              {manualCmd}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-brand"
              aria-label="Copy manual webhook command"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(manualCmd)
                  .then(() => toast('Command copied'))
                  .catch(() => {});
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </details>
      ) : null}
    </section>
  );
}
