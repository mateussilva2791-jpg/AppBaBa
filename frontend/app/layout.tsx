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
  title: "App do Baba",
  description: "Plataforma esportiva SaaS para ligas de baba, ranking e operacao ao vivo.",
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
