import type { Metadata } from "next";
import { IBM_Plex_Sans_Hebrew } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_Hebrew({ variable: "--font-plex", subsets: ["hebrew", "latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Lionet Pilot",
  description: "טייס אוטומטי לקידום אתרים בגוגל ובמנועי AI",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${plex.variable} antialiased`}>{children}</body>
    </html>
  );
}
