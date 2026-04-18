import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
        { status: 401 },
      );
    }
    if (!account.is_approved) {
      return NextResponse.json(
        { ok: false, error: "Account nicht freigeschaltet." },
        { status: 403 },
      );
    }

    const { id } = await params;

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: { owner_account_id: true },
    });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.caseSession.update({
      where: { id },
      data: {
        m2_token: token,
        m2_token_expires_at: expiresAt,
      },
    });

    const origin = req.nextUrl.origin;
    const link = `${origin}/m2-link/${token}`;

    return NextResponse.json({ ok: true, link });
  } catch (err) {
    console.error("[cases/[id]/m2-link]", err);
    return NextResponse.json(
      { ok: false, error: "Token konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
