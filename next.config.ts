import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Pragmatic Content-Security-Policy:
 *  - 'unsafe-inline' scripts/styles are required by Next.js hydration data.
 *  - Supabase hosts are allowed for payment-slip images / PDF embeds and the
 *    (server-side) Supabase API.
 *  - The entrance scanner camera is same-origin (html5-qrcode).
 * Dev additionally allows 'unsafe-eval' for React refresh.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "frame-src 'self' https://*.supabase.co",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // The local sandbox serves a standalone build; on Vercel (VERCEL=1) the
  // platform's default build output is used instead.
  output: process.env.VERCEL ? undefined : "standalone",
  // The personalised-ticket PDF generator reads the Canva-designed bases and
  // fonts from public/tickets at runtime — make sure they ship with the API
  // functions that send ticket emails.
  outputFileTracingIncludes: {
    "/api/admin/action": ["./public/tickets/**"],
    "/api/telegram-webhook": ["./public/tickets/**"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Site-wide hardened defaults.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Demo-mode PDF slips are shown INSIDE the console's own iframe, so
        // they must stay framable by this site (later rules override the
        // general DENY / frame-ancestors 'none' above for these responses).
        source: "/api/slip/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
