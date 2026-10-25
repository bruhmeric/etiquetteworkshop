import type { NextConfig } from "next";

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
  reactStrictMode: false,
};

export default nextConfig;
