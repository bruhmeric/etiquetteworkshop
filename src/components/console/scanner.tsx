'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import {
  AlertTriangle,
  CameraOff,
  CheckCircle2,
  Loader2,
  ScanLine,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CheckinResponse } from '@/lib/types';

interface LogEntry {
  time: string;
  code: string;
  result: CheckinResponse['result'];
  text: string;
}

export function Scanner({ demo }: { demo: boolean }) {
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const handleCode = useCallback(async (rawCode: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: rawCode }),
      });
      const json = (await res.json()) as CheckinResponse & { error?: string };
      if (!res.ok) {
        setResult({ result: 'error', text: json.error || 'Lookup failed.' });
        return;
      }
      setResult(json);
      setLog((l) =>
        [
          {
            time: new Date().toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            code: rawCode.toUpperCase(),
            result: json.result,
            text: json.text,
          },
          ...l,
        ].slice(0, 8)
      );
    } catch {
      setResult({ result: 'error', text: 'Network error.' });
    } finally {
      setBusy(false);
    }
  }, []);

  const onDecoded = useCallback(
    (text: string) => {
      const now = Date.now();
      if (text === lastScan.current.code && now - lastScan.current.at < 4000) return;
      lastScan.current = { code: text, at: now };
      handleCode(text);
    },
    [handleCode]
  );

  async function startCamera() {
    setStarting(true);
    setCameraError(null);
    try {
      const { Html5Qrcode: Ctor } = await import('html5-qrcode');
      const s = new Ctor('ee-qr-reader', { verbose: false });
      scannerRef.current = s;
      await s.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => onDecoded(decodedText),
        () => {
          /* per-frame decode misses are normal — ignore */
        }
      );
      setRunning(true);
    } catch (e) {
      setRunning(false);
      scannerRef.current = null;
      setCameraError(
        e instanceof Error && /permission|notfound|device/i.test(e.message)
          ? 'Camera unavailable or permission denied — use manual entry.'
          : 'Could not start the camera — use manual entry.'
      );
    } finally {
      setStarting(false);
    }
  }

  async function stopCamera() {
    const s = scannerRef.current;
    scannerRef.current = null;
    setRunning(false);
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
    }
  }

  useEffect(
    () => () => {
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    },
    []
  );

  const bannerStyles: Record<CheckinResponse['result'], string> = {
    success: 'border-success/50 bg-success/10 text-success',
    warning: 'border-warning/50 bg-warning/10 text-warning',
    error: 'border-destructive/50 bg-destructive/10 text-destructive',
  };
  const ResultIcon =
    result?.result === 'success' ? CheckCircle2 : result?.result === 'warning' ? AlertTriangle : XCircle;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* camera */}
      <section
        aria-label="Camera scanner"
        className="rounded-xl border border-border bg-card p-5 lg:col-span-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              Entrance scanner
            </h3>
            <p className="text-xs text-muted-foreground">
              Point the camera at the QR code on a ticket.
            </p>
          </div>
          <Button
            size="sm"
            variant={running ? 'outline' : 'default'}
            onClick={running ? stopCamera : startCamera}
            disabled={starting}
            className="h-9 rounded-full px-5"
          >
            {starting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {running ? 'Stop camera' : 'Start camera'}
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-secondary/40">
          {cameraError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <CameraOff className="h-7 w-7 text-destructive" aria-hidden="true" />
              <p className="max-w-xs text-sm text-muted-foreground">{cameraError}</p>
            </div>
          ) : (
            <div id="ee-qr-reader" className="min-h-[300px] w-full [&_video]:w-full" />
          )}
        </div>

        {demo ? (
          <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-[13px] leading-relaxed text-foreground">
            <span className="font-medium">Demo tip —</span> try codes from the dashboard:{' '}
            <code className="font-mono text-xs">TKT-A3F7QKZ</code> (valid),{' '}
            <code className="font-mono text-xs">TKT-D2K6WZN</code> (rejected), or type{' '}
            <code className="font-mono text-xs">TKT-ZZZZZZZ</code> for an invalid one.
          </p>
        ) : null}
      </section>

      {/* manual + result */}
      <section aria-label="Manual entry" className="space-y-5 lg:col-span-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <Label htmlFor="manual-code" className="text-sm font-medium">
            Manual code entry
          </Label>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const code = manual.trim();
              if (!code) return;
              setManual('');
              lastScan.current = { code: '', at: 0 };
              handleCode(code);
            }}
          >
            <Input
              id="manual-code"
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="TKT-… or EE-…"
              className="h-11 flex-1 font-mono"
              autoComplete="off"
            />
            <Button type="submit" disabled={busy} className="h-11 rounded-full px-5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanLine className="h-4 w-4" aria-hidden="true" />}
              <span className="sr-only">Verify</span>
            </Button>
          </form>
          <p className="mt-2.5 text-xs text-muted-foreground">
            Ticket codes (TKT-…) and reference codes (EE-…) both work.
          </p>
        </div>

        <div aria-live="polite" role="status">
          {result ? (
            <div className={`rounded-xl border-2 p-6 text-center ${bannerStyles[result.result]}`}>
              <ResultIcon className="mx-auto h-10 w-10" aria-hidden="true" />
              <p className="mt-3 text-lg font-semibold leading-snug">{result.text}</p>
              {result.category ? (
                <p className="mt-1 text-sm opacity-80">{result.category}</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Waiting for a scan…
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Recent scans
          </p>
          {log.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No scans yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {log.map((l, i) => (
                <li key={`${l.time}-${i}`} className="flex items-start gap-3 text-xs">
                  <span className="shrink-0 font-mono text-muted-foreground/70">{l.time}</span>
                  <span
                    className={`min-w-0 flex-1 font-medium ${
                      l.result === 'success'
                        ? 'text-success'
                        : l.result === 'warning'
                          ? 'text-warning'
                          : 'text-destructive'
                    }`}
                  >
                    {l.text}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground/70">{l.code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
