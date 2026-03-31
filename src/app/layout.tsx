import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TDF 2026 Live Tracker",
  description: "Suivi en direct du Tour de France amateur 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
