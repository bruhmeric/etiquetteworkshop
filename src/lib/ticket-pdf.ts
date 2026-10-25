import fs from 'node:fs';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import type { Registration } from './types';

/**
 * Personalised designed tickets ("Rs. 700" student / "Rs. 1,000" external).
 *
 * The Canva-designed bases live in `public/tickets/` as single-page PDFs
 * (946 × 192.252 pt). Each has a "Name:" fill line and a "Ticket No:" box on
 * the right stub; this module stamps the participant's name (script font,
 * deep maroon) and ticket code (PT Serif Bold, matching the label grey) onto
 * the appropriate design for their category.
 *
 * Everything is best-effort: on ANY failure the caller simply sends the
 * ticket email without the designed PDF attachment.
 */

const ASSET_DIR = path.join(process.cwd(), 'public', 'tickets');

/** Field geometry per category, in PDF points (origin = bottom-left). */
const FIELDS = {
  student: {
    base: 'student-ticket.pdf',
    // name fill area: dotted line at y≈58 (pdf), cream field x 756..916
    name: { centerX: 837, baseline: 60.8, maxWidth: 152, size: 19, minSize: 10 },
    // ticket-no box: x 818..930, y 8.5..41 (pdf)
    ticketNo: { centerX: 874, baseline: 21.1, maxWidth: 106, size: 11, minSize: 9 },
  },
  external: {
    base: 'external-ticket.pdf',
    name: { centerX: 840, baseline: 55.3, maxWidth: 152, size: 19, minSize: 10 },
    ticketNo: { centerX: 873, baseline: 17.5, maxWidth: 106, size: 11, minSize: 9 },
  },
} as const;

const MAROON = rgb(105 / 255, 33 / 255, 54 / 255); // matches the design's price colour
const LABEL_GREY = rgb(84 / 255, 84 / 255, 84 / 255); // matches the "Name:"/"Ticket No:" labels

type Kind = keyof typeof FIELDS;

/** Cache raw asset bytes once per server instance. */
const bytesCache = new Map<string, Buffer>();

function assetBytes(name: string): Buffer | null {
  if (bytesCache.has(name)) return bytesCache.get(name)!;
  try {
    const buf = fs.readFileSync(path.join(ASSET_DIR, name));
    bytesCache.set(name, buf);
    return buf;
  } catch {
    return null;
  }
}

function kindFor(category: string): Kind {
  return category === 'Lyceum Campus Student' ? 'student' : 'external';
}

/** Largest font size (>= min) at which `text` fits within `maxWidth`. */
function fitSize(font: PDFFont, text: string, start: number, min: number, maxWidth: number): number {
  let size = start;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

function drawCentered(
  page: ReturnType<PDFDocument['getPage']>,
  text: string,
  font: PDFFont,
  opts: { centerX: number; baseline: number; maxWidth: number; size: number; minSize: number; color: ReturnType<typeof rgb> }
) {
  const size = fitSize(font, text, opts.size, opts.minSize, opts.maxWidth);
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: opts.centerX - width / 2,
    y: opts.baseline,
    size,
    font,
    color: opts.color,
  });
}

/**
 * Generate the personalised designed-ticket PDF for a registration.
 * Returns the PDF bytes, or null when the design assets are unavailable
 * (e.g. tracing not configured) or anything goes wrong — never throws.
 */
export async function generateTicketPdf(
  rec: Pick<Registration, 'full_name' | 'ticket_code' | 'category'>
): Promise<Uint8Array | null> {
  try {
    const kind = kindFor(rec.category);
    const fields = FIELDS[kind];

    const baseBytes = assetBytes(fields.base);
    const nameFontBytes = assetBytes('Allura-Regular.ttf');
    const noFontBytes = assetBytes('PTSerif-Bold.ttf');
    if (!baseBytes || !nameFontBytes || !noFontBytes) return null;

    const doc = await PDFDocument.load(baseBytes);
    doc.registerFontkit(fontkit);
    const page = doc.getPage(0);
    const nameFont = await doc.embedFont(nameFontBytes, { subset: false });
    const noFont = await doc.embedFont(noFontBytes, { subset: false });

    const name = rec.full_name.replace(/\s+/g, ' ').trim();
    if (name) {
      drawCentered(page, name, nameFont, { ...fields.name, color: MAROON });
    }
    if (rec.ticket_code) {
      drawCentered(page, rec.ticket_code, noFont, { ...fields.ticketNo, color: LABEL_GREY });
    }

    return await doc.save();
  } catch (err) {
    console.error('[ticket-pdf] generation failed:', err);
    return null;
  }
}

/** Filename for the email attachment. */
export function ticketPdfFilename(rec: Pick<Registration, 'ticket_code'>): string {
  return `Etiquette-Essentials-Ticket-${rec.ticket_code}.pdf`;
}
