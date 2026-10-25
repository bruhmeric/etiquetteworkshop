import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local sandbox serves a standalone build; on Vercel (VERCEL=1) the
  // platform's default build output is used instead.
  output: process.env.VERCEL ? undefined : "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
