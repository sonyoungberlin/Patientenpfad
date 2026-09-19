"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type {
  AppShellAccount,
  AppShellPracticeRole,
} from "@/lib/appShellAccount";
import {
  getActiveNavigationItem,
  getAppShellContext,
  getCurrentNavigationRole,
  getNavigationSectionForPath,
  getVisibleNavigationSections,
} from "@/lib/navigation";

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

  const practiceRole = getCurrentNavigationRole(account);
  const homeHref = practiceRole === "INBOX_ONLY" ? "/questionnaires" : "/dashboard";
  const visibleSections = getVisibleNavigationSections(account);
  const currentSection =
    getNavigationSectionForPath(visibleSections, pathname) ??
    (practiceRole === "INBOX_ONLY" && pathname.startsWith("/inquiries")
      ? visibleSections.find((section) => section.id === "inbox") ?? null
      : null);
  const activeItemId = currentSection
    ? getActiveNavigationItem(currentSection, pathname)
    : null;
  const appShellContext = getAppShellContext(pathname);

  return (
    <nav className="app-nav">
      <div className="app-shell-topline" data-testid="app-shell-topline">
        <Link href={homeHref}>Hauptmenü</Link>
        <div className="app-shell-account-group" data-testid="app-shell-account-group">
          {appShellContext && (
            <span
              data-testid="app-shell-context"
              aria-label={`Aktueller Kontext: ${appShellContext.label}`}
              title={`Aktueller Kontext: ${appShellContext.label}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                flexShrink: 0,
              }}
            >
              <Image
                src={appShellContext.iconSrc}
                alt={appShellContext.label}
                width={40}
                height={40}
                sizes="40px"
                style={{ objectFit: "contain", flexShrink: 0 }}
              />
              <span className="app-shell-context-label">{appShellContext.label}</span>
            </span>
          )}
          <span className="account-email">{account.email}</span>
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
        </div>
      </div>
      {currentSection?.items.length ? (
        <div className="app-shell-sections" data-testid="app-shell-section-nav">
          {currentSection.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.id === activeItemId ? "page" : undefined}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              {item.label}
              {item.id === "digital-requests-inbox" && hasUnread && (
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
          ))}
        </div>
      ) : null}
    </nav>
  );
}
