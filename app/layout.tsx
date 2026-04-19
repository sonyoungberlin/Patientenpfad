import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: "Projektgrundgerüst",
  description: "Neutrales technisches Startgerüst",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        {children}
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
