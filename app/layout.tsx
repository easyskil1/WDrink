import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPromptLazy } from "@/components/InstallPromptLazy";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Drink World Győr - Admin",
  description: "Ital-nagykereskedés logisztikai admin rendszer",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  // iOS: kezdőképernyős app "standalone" módban (teljes képernyő, app-szerű,
  // és megjegyzett kamera-engedély).
  appleWebApp: {
    capable: true,
    title: "WDrinks",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  // A notch/kamerakivágás mögé is kiterjed (fontos a standalone appnál).
  viewportFit: "cover",
  // Ne nagyítva nyisson meg mobilon, és a mezőkre fókuszáláskor se zoomoljon.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hu"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Álló tájolás kényszerítése telefonon (CSS-vezérelt, csak fekvőben látszik) */}
        <div className="orientation-lock" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" />
            <path d="M2 9a5 5 0 0 1 5-5" />
            <path d="m2 6 0 3 3 0" />
          </svg>
          <p className="text-lg font-semibold">Fordítsd álló helyzetbe a telefont</p>
          <p className="text-sm opacity-70">Ez az alkalmazás álló nézetre készült.</p>
        </div>
        <ServiceWorkerRegister />
        <InstallPromptLazy />
        <SpeedInsights />
      </body>
    </html>
  );
}
