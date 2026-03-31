import type { Metadata } from "next";
import "./globals.css";
import { Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

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
  title: "TDF 2026 Live Tracker",
  description: "Suivi en direct du Tour de France amateur 2026",
  manifest: "/manifest.json",
  themeColor: "#F2C200",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TDF 2026",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
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
        {children}
      </body>
    </html>
  );
}
