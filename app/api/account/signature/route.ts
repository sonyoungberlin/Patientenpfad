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

  const data = await prisma.account.findUnique({
    where: { id: account.id },
    select: { message_signature: true },
  });

  return NextResponse.json({ ok: true, signature: data?.message_signature ?? "" });
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

  await prisma.account.update({
    where: { id: account.id },
    data: { message_signature: signature || null },
  });

  return NextResponse.json({ ok: true, signature });
}
