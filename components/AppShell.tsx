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

export type AppShellPracticeRole =
  | "OWNER"
  | "ADMIN"
  | "USER"
  | "INBOX_ONLY";

export type AppShellAccount = {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  inquiry_assistant_enabled: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
  office_cases_enabled: boolean;
  // Optional: aktiver Praxis-Kontext + Mitgliedschaften des Accounts.
  // Werden vom `/api/auth/me`-Endpoint mitgeliefert (siehe lib/auth.ts
  // `SessionAccount`) und hier benötigt, um Praxis-Nav-Items anhand der
  // effektiven Rolle des aktuellen Praxis-Kontexts zu filtern.
  // Defensiv optional, damit bestehende Aufrufer/Test-Doubles, die nur
  // die alten Felder setzen, nicht brechen.
  current_practice?: { id: string } | null;
  memberships?: Array<{ practice_id: string; role: AppShellPracticeRole }>;
};

type AppShellProps = {
  account?: AppShellAccount | null;
  onLogout?: () => void;
  /** Wird aus Server-Kontext befüllt oder intern per Fetch nachgeladen. */
  digitalRequestsHasUnread?: boolean;
};

export default function AppShell({
  account: accountProp,
  onLogout,
  digitalRequestsHasUnread: propHasUnread,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [internalAccount, setInternalAccount] = useState<AppShellAccount | null>(
    accountProp ?? null,
  );
  const [internalLoaded, setInternalLoaded] = useState<boolean>(accountProp !== undefined);
  const [hasUnread, setHasUnread] = useState<boolean>(propHasUnread ?? false);

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

  // Unread-Indikator für Digitale Anfragen – entweder per Prop (Server) oder Fetch.
  useEffect(() => {
    if (propHasUnread !== undefined) {
      setHasUnread(propHasUnread);
      return;
    }
    const currentAccount = accountProp !== undefined ? accountProp : internalAccount;
    if (!currentAccount?.patient_communication_enabled) return;

    fetch("/api/digital-requests/unread")
      .then((r) => r.json())
      .then((d: unknown) => {
        if (d && typeof d === "object" && "hasUnread" in d && (d as { hasUnread: boolean }).hasUnread) {
          setHasUnread(true);
        }
      })
      .catch(() => {});
  }, [accountProp, internalAccount, propHasUnread]);

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
  const isOfficeCases = inSection("/office-cases");
  const isPractice = inSection("/practice");
  const isWebsiteForms = inSection("/website-forms");
  const isDigitalRequests = inSection("/digital-requests");

  const practiceRole: AppShellPracticeRole | null =
    account.current_practice && account.memberships
      ? account.memberships.find(
          (m) => m.practice_id === account.current_practice!.id,
        )?.role ?? null
      : null;

  const canUseCases =
    practiceRole === null ||
    practiceRole === "OWNER" ||
    practiceRole === "ADMIN" ||
    practiceRole === "USER";
  const canUseDigitalRequests =
    practiceRole === null ||
    practiceRole === "OWNER" ||
    practiceRole === "ADMIN" ||
    practiceRole === "USER";
  const canUseInquiries =
    practiceRole === null ||
    practiceRole === "OWNER" ||
    practiceRole === "ADMIN" ||
    practiceRole === "USER";
  const canUseQuestionnaireInbox =
    practiceRole === null ||
    practiceRole === "OWNER" ||
    practiceRole === "ADMIN" ||
    practiceRole === "USER" ||
    practiceRole === "INBOX_ONLY";
  const canManagePractice =
    practiceRole === "OWNER" || practiceRole === "ADMIN";
  const homeHref = practiceRole === "INBOX_ONLY" ? "/questionnaires" : "/dashboard";

  type NavItem = { label: string; href: string };
  const sectionItems: NavItem[] = [];

  if (isCases && canUseCases) {
    sectionItems.push(
      { label: "Fallliste", href: "/cases" },
      { label: "Neuer Fall", href: "/" },
    );
  } else if (isOfficeCases && (account.office_cases_enabled || account.is_admin)) {
    sectionItems.push({ label: "Officefälle", href: "/office-cases" });
  } else if (isCommunication) {
    if (canUseInquiries) {
      sectionItems.push(
        { label: "Vorlagen", href: "/inquiries" },
        { label: "Neue Nachricht", href: "/inquiries/new" },
      );
    }
    if (canUseQuestionnaireInbox) {
      sectionItems.push({
        label: "Fragebogen-Posteingang",
        href: "/questionnaires",
      });
    }
  } else if (isPractice) {
    if (canManagePractice) {
      sectionItems.push({ label: "Mitglieder", href: "/practice/members" });
      sectionItems.push({ label: "Signatur", href: "/practice/signature" });
      if (account.website_forms_enabled) {
        sectionItems.push({ label: "Website-Formulare", href: "/website-forms" });
      }
    }
  } else if (isWebsiteForms && account.website_forms_enabled && canManagePractice) {
    sectionItems.push(
      { label: "Fragebogen-Posteingang", href: "/questionnaires" },
      { label: "Formularverwaltung", href: "/website-forms" },
    );
  }

  return (
    <nav className="app-nav">
      <Link href={homeHref}>Hauptmenü</Link>
      {account.patient_communication_enabled && canUseDigitalRequests && (
        <Link
          href="/digital-requests"
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          Digitale Anfragen
          {hasUnread && (
            <span
              data-testid="digital-requests-unread-dot"
              aria-label="Neue Anfragen vorhanden"
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                flexShrink: 0,
              }}
            />
          )}
        </Link>
      )}
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
