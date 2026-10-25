import type { Metadata, Viewport } from "next";
import { Playfair_Display, Cormorant_Garamond, Jost, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { EVENT } from "@/config/event";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Etiquette Essentials — You're Cordially Invited",
  description: `${EVENT.tagline}. ${EVENT.date.long}, ${EVENT.time.display} at ${EVENT.venue.full}. ${EVENT.description}`,
  keywords: [
    "Etiquette Essentials",
    "Upskill Workshop",
    "Professional Etiquette",
    "Social Etiquette",
    "Lyceum Campus",
    "Nugegoda",
    "BEd Intake 5",
  ],
  authors: [{ name: EVENT.organizer }],
  openGraph: {
    title: "Etiquette Essentials — You're Cordially Invited",
    description: `${EVENT.tagline} · ${EVENT.date.long} · ${EVENT.venue.full}`,
    siteName: "Etiquette Essentials",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b2029",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${cormorant.variable} ${jost.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
