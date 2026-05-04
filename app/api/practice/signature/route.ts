/**
 * Praxis-Nachrichtensignatur (PR 1 des Umzugs von Account- auf
 * Practice-Scope).
 *
 * Quelle der Wahrheit: `Practice.message_signature`. Die Signatur wird
 * an die aktuelle Practice des eingeloggten Aufrufers
 * (`account.current_practice.id`) gebunden — niemals aus dem Request-Body.
 *
 * Berechtigung (kein Plattform-Admin-Bypass):
 *   - GET: alle Mitglieder der aktuellen Practice (OWNER, ADMIN, USER) —
 *     M2/M3-Flows brauchen Lesezugriff für die „Nachricht kopieren"-UX.
 *   - PUT: nur OWNER und ADMIN. USER bekommen 403 „Rolle nicht ausreichend."
 *
 * Auth-Pattern analog `app/api/practice/members/route.ts`.
 */

import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePracticeRole } from "@/lib/authz";

const MAX_SIGNATURE_LENGTH = 300;

const ALL_ROLES: PracticeRole[] = [
  PracticeRole.OWNER,
  PracticeRole.ADMIN,
  PracticeRole.USER,
];

const WRITE_ROLES: PracticeRole[] = [
  PracticeRole.OWNER,
  PracticeRole.ADMIN,
];

/**
 * GET /api/practice/signature – aktuelle Practice-Signatur laden.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePracticeRole(req, ALL_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }

  try {
    const data = await prisma.practice.findUnique({
      where: { id: practice.id },
      select: { message_signature: true },
    });
    return NextResponse.json({
      ok: true,
      signature: data?.message_signature ?? "",
    });
  } catch (err) {
    // Fallback: Spalte existiert ggf. noch nicht (Migration nicht angewendet).
    console.error("[GET /api/practice/signature] DB error:", err);
    return NextResponse.json({ ok: true, signature: "" });
  }
}

/**
 * PUT /api/practice/signature – Practice-Signatur speichern.
 */
export async function PUT(req: NextRequest) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.signature !== "string") {
    return NextResponse.json(
      {
        ok: false,
        error: "Ungültiger Body. Erwartet: { signature: string }",
      },
      { status: 400 },
    );
  }

  const signature = body.signature.slice(0, MAX_SIGNATURE_LENGTH);

  try {
    await prisma.practice.update({
      where: { id: practice.id },
      data: { message_signature: signature || null },
    });
    return NextResponse.json({ ok: true, signature });
  } catch (err) {
    console.error("[PUT /api/practice/signature] DB error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Signatur konnte nicht gespeichert werden. Bitte Migration anwenden.",
      },
      { status: 503 },
    );
  }
}
