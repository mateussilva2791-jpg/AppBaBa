import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { AppShell } from "@/components/app-shell";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f1a14",
};

export const metadata: Metadata = {
  title: "BabaPro — Gerencie sua liga de futebol como os profissionais",
  description:
    "Sorteio inteligente, live ops em tempo real e ranking automático para babas e ligas amadoras. Grátis para começar, sem cartão de crédito.",
  keywords: [
    "baba pro futebol",
    "gerenciar liga amadora",
    "sorteio times futebol",
    "live ops futebol",
    "ranking liga amadora",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BabaPro",
  },
  icons: {
    icon: [
      { url: "/icon-48.png",  sizes: "48x48",   type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg",     type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "BabaPro — Gerencie sua liga como os profissionais",
    description:
      "Sorteio inteligente, live ops em tempo real e ranking automático para babas e ligas amadoras.",
    url: "https://frontend-steel-five-56.vercel.app",
    siteName: "BabaPro",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BabaPro",
    description: "Gerencie sua liga de futebol como os profissionais.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${barlow.variable} ${barlowCondensed.variable} font-sans`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
