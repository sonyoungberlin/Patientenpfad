import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav className="app-nav">
        <Link href="/cases">← Zur Fallübersicht</Link>
        <Link href="/">Neuer Fall</Link>
        <Link href="/admin/practices">Admin: Praxen</Link>
        <Link href="/admin/accounts">Admin: Accounts (Legacy)</Link>
      </nav>
      {children}
    </>
  );
}
