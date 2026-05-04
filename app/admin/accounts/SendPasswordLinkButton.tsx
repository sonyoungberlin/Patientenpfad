"use client";

/**
 * Admin-Aktion: Passwort-Setup-Link an einen bestehenden Account ausliefern.
 *
 * Ruft den bestehenden Endpoint `POST /api/auth/request-password-setup` auf.
 * Die Antwort enthält für Admin-Caller ein `delivery`-Feld:
 *
 *   - `"email"`  – Mailversand erfolgreich.
 *   - `"manual"` – Mailversand nicht möglich (z. B. Production läuft mit
 *     `MAIL_TRANSPORT=practice_only`). In diesem Fall ist `setupUrl`
 *     enthalten; der Admin kann den Link kopieren und sicher manuell
 *     weitergeben.
 *   - `"none"`   – Anfrage verarbeitet, aber kein passender Account.
 *
 * Es werden bewusst nur die Felder aus der API-Antwort verarbeitet — die
 * UI generiert oder rät keine URLs / Tokens. Tokens werden nicht geloggt.
 *
 * UI bewusst minimal (kein Design): Status-Text, ggf. Kopier-Button und
 * ein readonly Textfeld mit der setupUrl.
 */

import { useState } from "react";

type ApiResponse =
  | { ok: true; delivery: "email" }
  | { ok: true; delivery: "manual"; setupUrl: string }
  | { ok: true; delivery: "none" }
  | { ok: true };

type Status =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "email" }
  | { kind: "manual"; setupUrl: string; copied: boolean }
  | { kind: "none" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

/**
 * Pure Mapping-Funktion API-Antwort → UI-Status.
 *
 * Exportiert für Unit-Tests; keine Seiten-Effekte.
 */
export type ResolvedStatus = Exclude<
  Status,
  { kind: "idle" } | { kind: "pending" } | { kind: "error" }
>;

export function interpretSetupLinkResponse(json: unknown): ResolvedStatus {
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (obj.ok === true) {
      const delivery = obj.delivery;
      if (delivery === "email") {
        return { kind: "email" };
      }
      if (
        delivery === "manual" &&
        typeof obj.setupUrl === "string" &&
        obj.setupUrl.length > 0
      ) {
        return { kind: "manual", setupUrl: obj.setupUrl, copied: false };
      }
      if (delivery === "none") {
        return { kind: "none" };
      }
      return { kind: "ok" };
    }
  }
  return { kind: "ok" };
}

/**
 * Reine Status-Anzeige für `<SendPasswordLinkButton />`. Ausgeklammert,
 * damit die einzelnen Branches (insb. der manuelle Fallback mit Kopier-
 * Button und readonly Link-Feld) statisch testbar sind.
 */
export function SendPasswordLinkStatusView({
  email,
  status,
  onCopy,
}: {
  email: string;
  status: Status;
  onCopy?: () => void;
}) {
  if (status.kind === "email") {
    return (
      <span data-send-password-link-success={email}>
        Passwort-Link wurde versendet.
      </span>
    );
  }
  if (status.kind === "none") {
    return (
      <span data-send-password-link-none={email}>Anfrage verarbeitet.</span>
    );
  }
  if (status.kind === "ok") {
    return (
      <span data-send-password-link-ok={email}>Anfrage verarbeitet.</span>
    );
  }
  if (status.kind === "manual") {
    return (
      <span
        data-send-password-link-manual={email}
        style={{
          display: "inline-flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span>
          Mailversand nicht möglich. Link kopieren und sicher weitergeben.
        </span>
        <input
          type="text"
          readOnly
          value={status.setupUrl}
          aria-label="Passwort-Setup-Link"
          data-send-password-link-url={email}
          onFocus={(e) => e.currentTarget.select()}
          style={{ minWidth: "20rem" }}
        />
        <button
          type="button"
          onClick={onCopy}
          data-send-password-link-copy={email}
        >
          {status.copied ? "Kopiert" : "Link kopieren"}
        </button>
      </span>
    );
  }
  if (status.kind === "error") {
    return (
      <span
        role="alert"
        data-send-password-link-error={email}
        style={{ color: "#a00" }}
      >
        {status.message}
      </span>
    );
  }
  return null;
}

export function SendPasswordLinkButton({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onClick() {
    if (status.kind === "pending") return;
    setStatus({ kind: "pending" });
    try {
      const res = await fetch("/api/auth/request-password-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        // Sollte praktisch nie auftreten — die API antwortet immer 200.
        // Defensiv trotzdem als Fehler anzeigen.
        setStatus({
          kind: "error",
          message: "Versand fehlgeschlagen. Bitte später erneut versuchen.",
        });
        return;
      }
      const json = (await res.json().catch(() => ({}))) as ApiResponse;
      setStatus(interpretSetupLinkResponse(json));
    } catch {
      setStatus({
        kind: "error",
        message: "Versand fehlgeschlagen. Bitte später erneut versuchen.",
      });
    }
  }

  async function onCopy() {
    if (status.kind !== "manual") return;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(status.setupUrl);
      }
      setStatus({ ...status, copied: true });
    } catch {
      // Clipboard kann durch Browser-Permissions fehlschlagen — der Link
      // bleibt sichtbar im readonly-Feld, der Admin kann ihn manuell markieren.
      setStatus({ ...status, copied: false });
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={status.kind === "pending"}
        data-send-password-link={email}
      >
        {status.kind === "pending" ? "Sende…" : "Passwort-Link senden"}
      </button>
      <SendPasswordLinkStatusView
        email={email}
        status={status}
        onCopy={onCopy}
      />
    </span>
  );
}
