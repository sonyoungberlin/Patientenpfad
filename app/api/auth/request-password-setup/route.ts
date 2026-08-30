/**
 * POST /api/auth/request-password-setup
 *
 * Startet den „Passwort setzen per Link"-Flow:
 *
 *   - Wenn ein Account zur übergebenen E-Mail existiert, wird ein
 *     Einmal-Token erzeugt (`crypto.randomBytes(32).toString("hex")`),
 *     `password_reset_expires` auf `now + 1h` gesetzt und beides am
 *     Account gespeichert. Eine Mail mit dem Setup-Link wird verschickt.
 *   - Wenn kein Account existiert, wird **dieselbe** generische 200-Antwort
 *     geliefert (kein DB-Write, kein Mail-Versand). Damit gibt es keinen
 *     Account-Enumeration-Channel über diesen Endpoint.
 *
 * Admin-Fallback (Production-Setup mit `MAIL_TRANSPORT=practice_only`):
 *   - Wenn der aufrufende Nutzer ein Admin ist, liefert die Antwort
 *     zusätzlich ein `delivery`-Feld:
 *       * `"email"`  – Mailversand erfolgreich
 *       * `"manual"` – Mailversand nicht möglich; in diesem Fall ist
 *         `setupUrl` enthalten, damit der Admin den Link sicher manuell
 *         weitergeben kann.
 *       * `"none"`   – Es existiert kein passender Account.
 *   - `setupUrl` wird ausschließlich an Admin-Caller zurückgegeben.
 *   - Für nicht-Admin-Caller bleibt die Antwort wie bisher generisch
 *     (`{ ok: true }`), um Account-Enumeration auszuschließen.
 *
 * Bewusst nicht abgedeckt:
 *   - Rate-Limiting (außerhalb des Scopes; Empfehlung: vor Edge/Reverse-Proxy).
 *   - „Passwort vergessen"-Flow für Accounts, die bereits ein Passwort haben:
 *     Endpoint überschreibt den bestehenden Reset-Token zwar, aber das
 *     Passwort selbst wird erst durch `POST /api/auth/set-password` ersetzt.
 *
 * Sicherheits-/Logging-Invarianten:
 *   - Klartext-Token wird ausschließlich in die Mail-URL geschrieben (für
 *     Admins zusätzlich in die JSON-Antwort als `setupUrl`), niemals in
 *     Server-Logs.
 *   - Mailfehler führen NICHT zu einem 4xx/5xx (sonst würde unterschiedliches
 *     Antwortverhalten Account-Existenz leaken). Sie werden lediglich
 *     server-seitig geloggt – ohne Token / ohne `setupUrl`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import {
  issuePasswordReset,
  PASSWORD_RESET_GENERIC_MESSAGE,
} from "@/lib/auth/passwordReset";

function genericOk(): NextResponse {
  return NextResponse.json({ ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
}

export async function POST(req: NextRequest) {
  // Admin-Status des Aufrufers ermitteln. Ein fehlendes oder ungültiges
  // Session-Cookie bedeutet schlicht „nicht-Admin" – die Route bleibt
  // ansonsten weiterhin aufrufbar (anti-enumeration-Verhalten unverändert).
  let isAdmin = false;
  try {
    const session = await getSessionAccount(req);
    isAdmin = !!session?.is_admin;
  } catch {
    // Defensiv: Auth-Fehler dürfen den Flow nicht aufhalten und nichts leaken.
    isAdmin = false;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail: unknown = (body as Record<string, unknown>).email;
    const email = typeof rawEmail === "string" ? rawEmail : "";
    const result = await issuePasswordReset(email, req.headers, req.nextUrl.origin);
    if (!isAdmin) return genericOk();
    if (result.kind === "none" || result.kind === "limited") {
      return NextResponse.json({ ok: true, delivery: "none", message: PASSWORD_RESET_GENERIC_MESSAGE });
    }
    return NextResponse.json({ ok: true, delivery: result.delivery, ...(result.setupUrl ? { setupUrl: result.setupUrl } : {}) });
  } catch (err) {
    // Defensiv: auch bei unerwarteten Fehlern neutral antworten, damit
    // Account-Existenz nicht über Fehlerantworten beobachtbar wird.
    const detail = err instanceof Error ? err.message : "unknown";
    console.error("[auth/request-password-setup] FEHLER:", detail);
    return genericOk();
  }
}
