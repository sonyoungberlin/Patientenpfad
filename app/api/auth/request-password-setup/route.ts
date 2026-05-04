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
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { sendPasswordSetupEmail } from "@/lib/mail/sendPasswordSetupEmail";

// 1 Stunde Gültigkeit, exakt wie in der Aufgabenstellung gefordert.
const TOKEN_TTL_MS = 60 * 60 * 1000;

// 32 Byte → 64 hex-Zeichen. Enough entropy für einen Einmal-Token.
const TOKEN_BYTES = 32;

function genericOk(): NextResponse {
  return NextResponse.json({ ok: true });
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
    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;

    if (!email || !email.includes("@")) {
      // Auch hier neutral antworten — keine Eingabevalidierung leakt
      // Account-Existenz. Für Admin-Caller liefern wir `delivery: "none"`,
      // damit die UI eine Statusmeldung anzeigen kann.
      return isAdmin
        ? NextResponse.json({ ok: true, delivery: "none" })
        : genericOk();
    }

    const account = await prisma.account.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!account) {
      return isAdmin
        ? NextResponse.json({ ok: true, delivery: "none" })
        : genericOk();
    }

    const token = randomBytes(TOKEN_BYTES).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.account.update({
      where: { id: account.id },
      data: {
        password_reset_token: token,
        password_reset_expires: expiresAt,
      },
    });

    const setupUrl = `${req.nextUrl.origin}/account/set-password?token=${token}`;

    let mailOk = true;
    try {
      await sendPasswordSetupEmail({ to: account.email, setupUrl });
    } catch (err) {
      mailOk = false;
      // Bewusst nicht propagieren — sonst würde der Antwort-Status
      // Account-Existenz leaken. Token bleibt in der DB; ein erneuter
      // Aufruf überschreibt ihn mit frischem Wert. Wir loggen nur die
      // Fehlerursache (kein Token, keine setupUrl).
      const detail = err instanceof Error ? err.message : "unknown";
      console.error("[auth/request-password-setup] mail_failed:", detail);
    }

    if (!isAdmin) {
      // Nicht-Admin-Caller bekommen weiterhin nur eine generische Antwort,
      // unabhängig vom Mail-Erfolg, damit Account-Existenz nicht leakt und
      // insbesondere kein Token / setupUrl ausgegeben wird.
      return genericOk();
    }

    if (mailOk) {
      return NextResponse.json({ ok: true, delivery: "email" });
    }

    return NextResponse.json({
      ok: true,
      delivery: "manual",
      setupUrl,
    });
  } catch (err) {
    // Defensiv: auch bei unerwarteten Fehlern neutral antworten, damit
    // Account-Existenz nicht über Fehlerantworten beobachtbar wird.
    const detail = err instanceof Error ? err.message : "unknown";
    console.error("[auth/request-password-setup] FEHLER:", detail);
    return genericOk();
  }
}
