import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

/**
 * Layout für den `/digital-requests`-Bereich.
 *
 * Bindet die gemeinsame AppShell-Navigation ein,
 * analog zu `/cases`, `/inquiries`, `/practice` etc.
 *
 * Auth-Guard: liegt bereits in den Page-Komponenten
 * (`requirePatientCommunicationAccessFromCookies` + INBOX_ONLY-Redirect).
 * Das Layout prüft daher nicht erneut — kein doppelter DB-Roundtrip.
 */
export default function DigitalRequestsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <AppShell />
      {children}
    </>
  );
}
