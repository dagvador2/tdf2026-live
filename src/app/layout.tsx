import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { PWAUpdateReloader } from "@/components/layout/PWAUpdateReloader";
import { RaceBanner } from "@/components/coureur/RaceBanner";
import { LiveStageBanner } from "@/components/live/LiveStageBanner";
import { WelcomeTour } from "@/components/onboarding/WelcomeTour";
import { MigrationBanner } from "@/components/onboarding/MigrationBanner";
import { Providers } from "./providers";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://letourexplorer.com"),
  title: "Tour de France Explorer",
  description: "Suivi en direct du Tour de France amateur 2026",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "Tour de France Explorer",
    title: "Tour de France Explorer",
    description: "Suivi en direct du Tour de France amateur 2026",
    url: "/",
    locale: "fr_FR",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TDF 2026",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F2C200",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn(
        bebasNeue.variable,
        inter.variable,
        jetbrainsMono.variable
      )}
    >
      <body className="font-body antialiased">
        <Providers>
          <PWAUpdateReloader />
          <MigrationBanner />
          <Header />
          <LiveStageBanner />
          <main className="min-h-screen pb-20 md:pb-0">{children}</main>
          <Footer />
          <RaceBanner />
          <MobileNav />
          <WelcomeTour />
        </Providers>
      </body>
    </html>
  );
}
