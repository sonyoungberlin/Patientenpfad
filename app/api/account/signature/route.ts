/**
 * @deprecated Account-bezogene Nachrichtensignatur. Wird durch
 *   `/api/practice/signature` ersetzt (siehe
 *   `app/api/practice/signature/route.ts`). Diese Route bleibt vorerst
 *   bestehen, damit alte Tabs/Clients während des Roll-outs nicht ins
 *   Leere laufen; sie wird im Cleanup-PR (PR 2) entfernt — gleichzeitig
 *   mit dem Drop von `Account.message_signature`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SIGNATURE_LENGTH = 300;

/**
 * GET /api/account/signature – Aktuelle Nachrichtensignatur laden.
 */
export async function GET(req: NextRequest) {
  const account = await getSessionAccount(req);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const data = await prisma.account.findUnique({
      where: { id: account.id },
      select: { message_signature: true },
    });

    return NextResponse.json({ ok: true, signature: data?.message_signature ?? "" });
  } catch (err) {
    // Fallback: column may not exist yet if migration has not been applied
    console.error("[GET /api/account/signature] DB error:", err);
    return NextResponse.json({ ok: true, signature: "" });
  }
}

/**
 * PUT /api/account/signature – Nachrichtensignatur speichern.
 */
export async function PUT(req: NextRequest) {
  const account = await getSessionAccount(req);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.signature !== "string") {
    return NextResponse.json(
      { ok: false, error: "Ungültiger Body. Erwartet: { signature: string }" },
      { status: 400 },
    );
  }

  const signature = body.signature.slice(0, MAX_SIGNATURE_LENGTH);

  try {
    await prisma.account.update({
      where: { id: account.id },
      data: { message_signature: signature || null },
    });

    return NextResponse.json({ ok: true, signature });
  } catch (err) {
    // Fallback: column may not exist yet if migration has not been applied
    console.error("[PUT /api/account/signature] DB error:", err);
    return NextResponse.json(
      { ok: false, error: "Signatur konnte nicht gespeichert werden. Bitte Migration anwenden." },
      { status: 503 },
    );
  }
}
