import type { ReactNode } from "react";
import Link from "next/link";

export default function QuestionnairesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <nav className="app-nav">
        <Link href="/cases">← Zur Fallübersicht</Link>
        <Link href="/">Neuer Fall</Link>
      </nav>
      {children}
    </>
  );
}
