"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

/**
 * Shared header / account bar for internal app areas.
 *
 * Extracts the existing account-bar UI from `app/page.tsx` so that
 * internal modules (inquiries, questionnaires, website-forms,
 * practice, …) share the same module navigation, e-mail display and
 * logout button.
 *
 * Keine neuen Features, keine geänderte Logik:
 *   - Modul-Buttons werden – wie bisher in `app/page.tsx` – nur
 *     gerendert, wenn die zugehörigen Feature-Flags am Account gesetzt
 *     sind.
 *   - Die Account-Daten werden über `/api/auth/me` geladen, falls nicht
 *     als Prop übergeben (gleicher Endpoint wie heute in `app/page.tsx`).
 *   - Logout ruft – wie bisher – `POST /api/auth/logout` und navigiert
 *     anschließend zurück nach `/`.
 *
 * Wenn kein Account vorliegt (nicht eingeloggt oder noch nicht geladen)
 * rendert die Komponente bewusst nichts. Damit sind eingebettete Layouts
 * (z. B. Login-Sicht) nicht betroffen.
 */

export type AppShellAccount = {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  inquiry_assistant_enabled: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
};

type AppShellProps = {
  account?: AppShellAccount | null;
  onLogout?: () => void;
};

export default function AppShell({ account: accountProp, onLogout }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [internalAccount, setInternalAccount] = useState<AppShellAccount | null>(
    accountProp ?? null,
  );
  const [internalLoaded, setInternalLoaded] = useState<boolean>(accountProp !== undefined);

  useEffect(() => {
    if (accountProp !== undefined) {
      setInternalAccount(accountProp);
      setInternalLoaded(true);
      return;
    }
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d && d.ok) setInternalAccount(d.account as AppShellAccount);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInternalLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [accountProp]);

  async function handleLogoutDefault() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setInternalAccount(null);
    router.push("/");
    router.refresh();
  }

  const account = accountProp !== undefined ? accountProp : internalAccount;
  if (!internalLoaded || !account || !account.is_approved) {
    return null;
  }

  const handleLogoutClick = onLogout ?? handleLogoutDefault;

  // Bereich aus dem aktuellen Pfad ableiten. Exakte Übereinstimmung des
  // Segment-Anfangs, damit z. B. /casesfoo nicht fälschlich /cases trifft.
  const inSection = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");

  // `/` ist faktisch der „Neuer Fall"-Einstieg und gehört damit zum
  // Patientenfälle-Bereich – auch dort sollen Hauptmenü, Fallliste und
  // Neuer Fall in der AppShell erscheinen.
  const isCases = pathname === "/" || inSection("/cases");
  const isCommunication =
    inSection("/inquiries") || inSection("/questionnaires");
  const isPractice = inSection("/practice");
  const isWebsiteForms = inSection("/website-forms");

  type NavItem = { label: string; href: string };
  const sectionItems: NavItem[] = [];

  if (isCases) {
    sectionItems.push(
      { label: "Fallliste", href: "/cases" },
      { label: "Neuer Fall", href: "/" },
    );
  } else if (isCommunication) {
    sectionItems.push(
      { label: "Vorlagen", href: "/inquiries" },
      { label: "Neue Nachricht", href: "/inquiries/new" },
      { label: "Fragebogen-Posteingang", href: "/questionnaires" },
    );
  } else if (isPractice) {
    sectionItems.push(
      { label: "Mitglieder", href: "/practice/members" },
      { label: "Signatur", href: "/practice/signature" },
    );
  } else if (isWebsiteForms && account.website_forms_enabled) {
    sectionItems.push(
      { label: "Fragebogen-Posteingang", href: "/questionnaires" },
      { label: "Formularverwaltung", href: "/website-forms" },
    );
  }

  return (
    <nav className="app-nav">
      <Link href="/dashboard">Hauptmenü</Link>
      {sectionItems.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
      <span className="account-email" style={{ marginLeft: "auto" }}>
        {account.email}
      </span>
      <button
        type="button"
        onClick={handleLogoutClick}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          font: "inherit",
          color: "var(--muted-foreground)",
          fontSize: "0.875rem",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Abmelden
      </button>
    </nav>
  );
}
