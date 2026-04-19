import type { ReactNode } from 'react';
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
            <a href="/hinweise">Hinweise zur Nutzung</a>
            <span aria-hidden="true">·</span>
            <a href="/datenschutz">Datenschutz</a>
            <span aria-hidden="true">·</span>
            <a href="/impressum">Impressum</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
