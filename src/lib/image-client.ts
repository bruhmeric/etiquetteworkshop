'use client';

/**
 * Client-side slip preparation.
 *  - Images (JPG/PNG/WebP) are downscaled to ≤1600px & re-encoded as JPEG
 *    so the JSON payload stays well under Vercel's 4.5 MB body limit.
 *  - PDFs cannot be compressed client-side, so they are size-checked
 *    (≤ 3 MB) and passed through as-is.
 */
export interface PreparedSlip {
  dataUrl: string;
  fileName: string;
  kind: 'image' | 'pdf';
}

const MAX_DIM = 1600;
const QUALITY = 0.85;
const MAX_BYTES = 4 * 1024 * 1024; // data-URL length cap (≈3 MB file)
const MAX_PDF_BYTES = 3 * 1024 * 1024; // raw PDF size cap

export async function prepareSlipUpload(file: File): Promise<PreparedSlip> {
  const isPdf =
    file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');

  if (isPdf) {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error('That PDF is too large — please upload one under 3 MB.');
    }
    const dataUrl = await readAsDataUrl(file);
    if (dataUrl.length > MAX_BYTES) {
      throw new Error('That PDF is too large — please upload one under 3 MB.');
    }
    const stem = (file.name || 'slip').split(/[\\/]/).pop() || 'slip';
    const safeStem = stem.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || 'slip';
    return {
      dataUrl,
      fileName: /\.pdf$/i.test(safeStem) ? safeStem : `${safeStem}.pdf`,
      kind: 'pdf',
    };
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload a JPG, PNG, WebP image or a PDF file.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('That image is too large. Please upload a smaller photo.');
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
    if (dataUrl.length > MAX_BYTES) {
      throw new Error('Image still too large after compression. Please upload a simpler photo.');
    }
    const base = (file.name || 'slip').split(/[\\/]/).pop() || 'slip';
    const stem = base.replace(/\.[^.]+$/, '') || 'slip';
    return { dataUrl, fileName: `${stem.slice(0, 60)}.jpg`, kind: 'image' };
  } catch (err) {
    // createImageBitmap / canvas unavailable → send original if small enough.
    if (file.size <= 3.5 * 1024 * 1024 && file.type !== 'image/gif') {
      const dataUrl = await readAsDataUrl(file);
      if (dataUrl.length > MAX_BYTES) {
        throw new Error('Image too large. Please upload a smaller photo.');
      }
      return { dataUrl, fileName: file.name || 'slip', kind: 'image' };
    }
    throw err instanceof Error && err.message !== 'canvas'
      ? err
      : new Error('Could not process this image. Please try a different photo.');
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.readAsDataURL(file);
  });
}
