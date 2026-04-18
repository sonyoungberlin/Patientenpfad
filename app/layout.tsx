import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = {
  title: "Projektgrundgerüst",
  description: "Neutrales technisches Startgerüst",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <nav style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
          <Link href="/cases" style={{ textDecoration: "none", color: "#111", fontFamily: "sans-serif", fontSize: "0.9rem" }}>
            ← Zur Übersicht
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
