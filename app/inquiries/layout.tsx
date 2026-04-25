import type { ReactNode } from "react";
import Link from "next/link";

export default function InquiriesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav className="app-nav">
        <Link href="/inquiries">← Zur Übersicht</Link>
        <Link href="/inquiries/new">Neue Anfrage</Link>
      </nav>
      {children}
    </>
  );
}
