import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import TourController from '@/components/TourController';
import ScrollToTop from '@/components/ScrollToTop';
import './globals.css';

export const metadata: Metadata = {
  title: "teamwork.contact",
  description: "Digitale Zusammenarbeit und strukturierte Kommunikation.",
  applicationName: "teamwork.contact",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/teamwork-contact-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/teamwork-contact-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    title: "teamwork.contact",
    description: "Digitale Zusammenarbeit und strukturierte Kommunikation.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1d36",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        {children}
        <Suspense fallback={null}>
          <TourController />
        </Suspense>
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <footer className="app-footer">
          <nav>
            <Link href="/hinweise">Hinweise zur Nutzung</Link>
            <span aria-hidden="true">·</span>
            <Link href="/datenschutz">Datenschutz</Link>
            <span aria-hidden="true">·</span>
            <Link href="/impressum">Impressum</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
