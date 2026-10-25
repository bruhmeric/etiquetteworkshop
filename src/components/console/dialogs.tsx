'use client';

import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { EVENT } from '@/config/event';
import type { Registration } from '@/lib/types';

/** PDF slips expose their type via the `.pdf` extension in slip_url. */
export function isPdfSlipUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

export function TicketViewer({
  ticket,
  onClose,
}: {
  ticket: { rec: Registration; qrDataUrl: string; note?: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(ticket)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-md" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Workshop ticket</DialogTitle>
        {ticket ? (
          <div className="px-6 py-8 text-center sm:px-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-brand">
              Etiquette Essentials
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-foreground">
              WORKSHOP PASS
            </h3>
            <div className="mt-2 h-px w-14 mx-auto bg-brand/80" aria-hidden="true" />

            <p className="mt-6 font-display text-2xl font-semibold leading-snug text-foreground">
              {ticket.rec.full_name}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              {ticket.rec.category} · Rs. {ticket.rec.amount}
            </p>

            <div className="mt-6 space-y-1.5 rounded-lg border border-border bg-secondary/50 p-4 text-left text-sm text-muted-foreground">
              <p>
                <span className="inline-block w-16 font-medium text-foreground">Event</span>
                Etiquette Essentials Workshop
              </p>
              <p>
                <span className="inline-block w-16 font-medium text-foreground">Date</span>
                {EVENT.date.long}
              </p>
              <p>
                <span className="inline-block w-16 font-medium text-foreground">Time</span>
                {EVENT.time.display}
              </p>
              <p>
                <span className="inline-block w-16 font-medium text-foreground">Venue</span>
                {EVENT.venue.full}
              </p>
              <p>
                <span className="inline-block w-16 font-medium text-foreground">Ticket</span>
                <span className="font-mono text-foreground">{ticket.rec.ticket_code}</span>
              </p>
              {ticket.rec.checked_in ? (
                <p className="pt-1 text-[13px] font-medium text-success">
                  ✓ Checked in at the entrance
                </p>
              ) : null}
            </div>

            <div className="mt-7">
              <img
                src={ticket.qrDataUrl}
                alt={`Entry QR code for ${ticket.rec.full_name}`}
                className="mx-auto h-56 w-56 rounded-lg border border-border bg-white p-3"
              />
              <p className="mt-3 font-mono text-sm tracking-[0.14em] text-foreground">
                {ticket.rec.ticket_code}
              </p>
            </div>

            {ticket.note ? (
              <p className="mt-6 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-left text-[13px] leading-relaxed text-foreground">
                {ticket.note}
              </p>
            ) : null}

            <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              {EVENT.organizer}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function SlipViewer({
  slip,
  onClose,
}: {
  slip: { name: string; url: string } | null;
  onClose: () => void;
}) {
  const isPdf = slip ? isPdfSlipUrl(slip.url) : false;
  return (
    <Dialog open={Boolean(slip)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Payment slip</DialogTitle>
        {slip ? (
          <figure className="px-5 py-5 sm:px-7 sm:py-7">
            {isPdf ? (
              <>
                <iframe
                  src={slip.url}
                  title={`Payment slip uploaded by ${slip.name}`}
                  className="h-[70vh] w-full rounded-lg border border-border bg-white"
                />
                <a
                  href={slip.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline decoration-brand/60 underline-offset-4 hover:text-brand"
                >
                  Open PDF in a new tab
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </>
            ) : (
              <img
                src={slip.url}
                alt={`Payment slip uploaded by ${slip.name}`}
                className="max-h-[70vh] w-full rounded-lg border border-border bg-white object-contain"
              />
            )}
            <figcaption className="mt-3 text-center text-sm text-muted-foreground">
              Payment slip ({isPdf ? 'PDF' : 'image'}) ·{' '}
              <span className="font-medium text-foreground">{slip.name}</span>
            </figcaption>
          </figure>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
