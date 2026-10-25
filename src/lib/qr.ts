import QRCode, { type QRCodeToDataURLOptions } from 'qrcode';

const OPTS: QRCodeToDataURLOptions = {
  margin: 1,
  width: 480,
  color: { dark: '#1c2d5aff', light: '#ffffffff' },
};

/** Data-URL QR (for on-screen display in the console). */
export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, OPTS);
}

/** PNG bytes of the same QR (decoded from the data URL) — for emailing / storage upload. */
export async function qrPngBuffer(text: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, OPTS);
  const b64 = dataUrl.split(',')[1] ?? '';
  return new Uint8Array(Buffer.from(b64, 'base64'));
}
