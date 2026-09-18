import type { ReactNode } from "react";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { toAppShellAccount } from "@/lib/appShellAccount";
import AppShell from "@/components/AppShell";

/**
 * Layout für den `/digital-requests`-Bereich.
 *
 * Bindet die gemeinsame AppShell-Navigation ein,
 * analog zu `/cases`, `/inquiries`, `/practice` etc.
 *
 * Der Page-Guard bleibt die Berechtigungsquelle. Das Layout liest den
 * Session-Account zusätzlich nur für die serverseitige AppShell-Übergabe.
 */
export default async function DigitalRequestsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const account = await getSessionAccountFromCookies();
  return (
    <>
      <AppShell account={toAppShellAccount(account)} />
      {children}
    </>
  );
}
