import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import TourController from '@/components/TourController';
import './globals.css';

export const metadata: Metadata = {
  title: "Patientenpfad",
  description: "Unklarheiten klären und strukturiert dokumentieren.",
  openGraph: {
    title: "Patientenpfad",
    description: "Unklarheiten klären und strukturiert dokumentieren.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        {children}
        <Suspense fallback={null}>
          <TourController />
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
