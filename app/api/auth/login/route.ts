import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_DURATION_MS } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

type LoginMembership = {
  practice_id: string;
  role: PracticeRole;
  created_at: Date;
};

function getLoginRedirectPath(account: {
  default_practice_id?: string | null;
  memberships?: LoginMembership[];
}): "/dashboard" | "/questionnaires" {
  const memberships = Array.isArray(account.memberships)
    ? account.memberships
    : [];
  if (memberships.length === 0) return "/dashboard";

  let currentMembership =
    account.default_practice_id != null
      ? memberships.find((m) => m.practice_id === account.default_practice_id)
      : null;

  if (!currentMembership) {
    currentMembership =
      memberships.find((m) => m.role === PracticeRole.OWNER) ??
      [...memberships].sort(
        (a, b) => a.created_at.getTime() - b.created_at.getTime(),
      )[0] ??
      null;
  }

  return currentMembership?.role === PracticeRole.INBOX_ONLY
    ? "/questionnaires"
    : "/dashboard";
}

/**
 * Einheitliche, neutrale Antwort fuer alle Faelle, in denen der erste
 * Authentifizierungsfaktor (E-Mail + Passwort) fehlschlaegt:
 *  - Account existiert nicht
 *  - Passwort ist falsch
 *  - Account hat (noch) kein Passwort gesetzt (`password_hash IS NULL`)
 *
 * Damit wird eine Account-Enumeration ueber Login-Antworten verhindert.
 */
function neutralAuthFailure(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "E-Mail oder Passwort ungültig." },
    { status: 401 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail: unknown = (body as Record<string, unknown>).email;
    const rawPassword: unknown = (body as Record<string, unknown>).password;

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
    const password = typeof rawPassword === "string" ? rawPassword : null;

    if (!email || !email.includes("@") || !password) {
      // Fehlende/ungueltige Eingabe: ebenfalls neutral antworten, damit
      // Angreifer keinen "ist diese E-Mail bekannt"-Channel bekommen.
      return neutralAuthFailure();
    }

    const account = await prisma.account.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        is_approved: true,
        password_hash: true,
        default_practice_id: true,
        memberships: {
          select: {
            practice_id: true,
            role: true,
            created_at: true,
          },
        },
      },
    });

    if (!account) {
      return neutralAuthFailure();
    }

    const passwordOk = await verifyPassword(password, account.password_hash);
    if (!passwordOk) {
      return neutralAuthFailure();
    }

    // Erst NACH erfolgreicher Authentifizierung darf ueber den Freischaltungs-
    // status informiert werden — das ist akzeptabel, da der Zugriff bereits
    // bewiesen wurde.
    if (!account.is_approved) {
      return NextResponse.json(
        { ok: false, error: "Ihr Account ist noch nicht freigeschaltet." },
        { status: 403 },
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await prisma.session.create({
      data: { token, account_id: account.id, expiresAt },
    });

    const response = NextResponse.json({
      ok: true,
      account: {
        id: account.id,
        email: account.email,
        is_approved: account.is_approved,
      },
      redirectTo: getLoginRedirectPath(account),
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    // Klartext-Passwoerter und E-Mails niemals loggen. Nur Fehlertyp/Message
    // (ohne Body) protokollieren.
    const detail = err instanceof Error ? err.message : "unknown";
    console.error("[auth/login] FEHLER:", detail);
    return NextResponse.json(
      { ok: false, error: "Login fehlgeschlagen." },
      { status: 500 },
    );
  }
}
