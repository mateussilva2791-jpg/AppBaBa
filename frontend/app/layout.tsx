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
  title: "App do Baba — Gerencie sua liga de futebol como os profissionais",
  description:
    "Sorteio inteligente, live ops em tempo real e ranking automático para babas e ligas amadoras. Grátis para começar, sem cartão de crédito.",
  keywords: [
    "app baba futebol",
    "gerenciar liga amadora",
    "sorteio times futebol",
    "live ops futebol",
    "ranking liga amadora",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "App do Baba",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "App do Baba — Gerencie sua liga como os profissionais",
    description:
      "Sorteio inteligente, live ops em tempo real e ranking automático para babas e ligas amadoras.",
    url: "https://baba-frontend.onrender.com",
    siteName: "App do Baba",
    type: "website",
    images: [{ url: "https://baba-frontend.onrender.com/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "App do Baba",
    description: "Gerencie sua liga de futebol como os profissionais.",
    images: ["https://baba-frontend.onrender.com/og-image.png"],
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
