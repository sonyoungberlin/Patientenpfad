/**
 * POST /api/auth/set-password
 *
 * Konsumiert einen per `request-password-setup` ausgestellten Einmal-Token
 * und setzt das Passwort des zugehörigen Accounts.
 *
 * Input (JSON):
 *   { token: string, password: string }
 *
 * Verhalten:
 *   - Token muss existieren und nicht abgelaufen sein
 *     (`password_reset_expires > now`).
 *   - Passwort muss `MIN_PASSWORD_LENGTH` erfüllen (= 10, identisch zu
 *     `lib/password.ts`).
 *   - Bei Erfolg: `password_hash` wird gesetzt, `password_reset_token` und
 *     `password_reset_expires` werden auf NULL gesetzt (Token verbraucht).
 *
 * Sicherheits-/Logging-Invarianten:
 *   - Klartext-Passwort und Token werden niemals geloggt.
 *   - Bestehende Auth-/Login-Logik wird NICHT verändert; dieser Endpoint
 *     setzt lediglich `Account.password_hash` und räumt den Reset-Token.
 *   - Bei ungültigem/abgelaufenem Token wird 400 zurückgegeben — der
 *     Endpoint ist anonym (Token = Capability), daher gibt es hier keinen
 *     Enumerations-Vektor wie beim Request-Endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawToken: unknown = (body as Record<string, unknown>).token;
    const rawPassword: unknown = (body as Record<string, unknown>).password;

    const token = typeof rawToken === "string" ? rawToken : null;
    const password = typeof rawPassword === "string" ? rawPassword : null;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Ungültiger oder abgelaufener Link." },
        { status: 400 },
      );
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
        },
        { status: 400 },
      );
    }

    const account = await prisma.account.findUnique({
      where: { password_reset_token: token },
      select: {
        id: true,
        password_reset_expires: true,
      },
    });

    if (
      !account ||
      !account.password_reset_expires ||
      account.password_reset_expires < new Date()
    ) {
      return NextResponse.json(
        { ok: false, error: "Ungültiger oder abgelaufener Link." },
        { status: 400 },
      );
    }

    const password_hash = await hashPassword(password);

    await prisma.account.update({
      where: { id: account.id },
      data: {
        password_hash,
        password_reset_token: null,
        password_reset_expires: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Klartext-Passwort und Token niemals in Logs.
    const detail = err instanceof Error ? err.message : "unknown";
    console.error("[auth/set-password] FEHLER:", detail);
    return NextResponse.json(
      { ok: false, error: "Passwort konnte nicht gesetzt werden." },
      { status: 500 },
    );
  }
}
