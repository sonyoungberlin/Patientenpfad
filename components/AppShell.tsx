"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type {
  AppShellAccount,
  AppShellPracticeRole,
} from "@/lib/appShellAccount";

export type { AppShellAccount, AppShellPracticeRole } from "@/lib/appShellAccount";

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
 *   - Der Account wird von den serverseitigen internen Layouts oder Pages als
 *     Prop übergeben.
 *   - Logout ruft – wie bisher – `POST /api/auth/logout` und navigiert
 *     anschließend zurück nach `/`.
 *
 * Wenn kein Account vorliegt, rendert die Komponente bewusst nichts. Es gibt
 * dabei keinen clientseitigen Auth-Fallback, damit interne Seiten nicht
 * während einer erneuten `/api/auth/me`-Abfrage verschwinden.
 */

type AppShellProps = {
  account: AppShellAccount | null;
  onLogout?: () => void;
  digitalRequestsHasUnread?: boolean;
};

export default function AppShell({
  account,
  onLogout,
  digitalRequestsHasUnread: propHasUnread,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [hasUnread, setHasUnread] = useState<boolean>(propHasUnread ?? false);

  // Unread-Indikator für Digitale Anfragen – entweder per Prop (Server) oder Fetch.
  useEffect(() => {
    if (propHasUnread !== undefined) {
      setHasUnread(propHasUnread);
      return;
    }
    if (!account?.patient_communication_enabled) return;

    fetch("/api/digital-requests/unread")
      .then((r) => r.json())
      .then((d: unknown) => {
        if (d && typeof d === "object" && "hasUnread" in d && (d as { hasUnread: boolean }).hasUnread) {
          setHasUnread(true);
        }
      })
      .catch(() => {});
  }, [account, propHasUnread]);

  async function handleLogoutDefault() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  if (!account || !account.is_approved) {
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
  const isCases = inSection("/cases");
  const isCommunication =
    inSection("/inquiries") || inSection("/questionnaires");
  const isOfficeCases = inSection("/office-cases");
  const isWorkflowCases = inSection("/workflow-cases");
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
    practiceRole === "USER" ||
    practiceRole === "INBOX_ONLY";
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
    if (canManagePractice) {
      sectionItems.push({ label: "Officefälle", href: "/office-cases" });
      sectionItems.push({ label: "Fragebögen", href: "/office-cases/questionnaire" });
    }
    // USER darf Bewerbungsanfragen bearbeiten, aber keine Fragebögen öffnen
    if (canManagePractice || practiceRole === "USER") {
      sectionItems.push({ label: "Bewerbungsanfragen", href: "/office-cases/applications" });
    }
  } else if (isWorkflowCases && (account.arbeitsprozesse_enabled || account.is_admin)) {
    sectionItems.push(
      { label: "Arbeitsprozesse", href: "/workflow-cases" },
      { label: "Neue Sitzung", href: "/workflow-cases/internal-protocol/new" },
      { label: "Praxiskatalog", href: "/practice/catalog" },
    );
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
    if (account.patient_communication_enabled && canUseDigitalRequests) {
      sectionItems.push({ label: "Digitale Anfragen", href: "/digital-requests" });
    }
  } else if (isPractice) {
    if (account.arbeitsprozesse_enabled || account.is_admin) {
      sectionItems.push({ label: "Praxiskatalog", href: "/practice/catalog" });
    }
    if (canManagePractice) {
      sectionItems.push({ label: "Mitglieder", href: "/practice/members" });
      if (practiceRole === "OWNER") {
        sectionItems.push({ label: "Kiosk-Geräte", href: "/practice/questionnaire-kiosk" });
      }
      sectionItems.push({ label: "Offizielle Praxisdaten", href: "/practice/legal-profile" });
      sectionItems.push({ label: "Signatur", href: "/practice/signature" });
      sectionItems.push({ label: "Anfrage-Einstellungen", href: "/practice/inquiry-settings" });
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
      {account.patient_communication_enabled && canUseDigitalRequests && isDigitalRequests && (
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
