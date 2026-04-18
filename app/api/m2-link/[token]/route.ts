import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const session = await prisma.caseSession.findUnique({
      where: { m2_token: token },
      select: { id: true, m2_token_expires_at: true },
    });

    if (!session || !session.m2_token_expires_at) {
      return NextResponse.json(
        { ok: false, error: "Link ungültig oder abgelaufen." },
        { status: 404 },
      );
    }

    if (session.m2_token_expires_at < new Date()) {
      return NextResponse.json(
        { ok: false, error: "Link ungültig oder abgelaufen." },
        { status: 410 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Malformed JSON body" },
        { status: 400 },
      );
    }

    if (
      !body?.prefill ||
      typeof body.prefill !== "object" ||
      Array.isArray(body.prefill)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    await prisma.caseSession.update({
      where: { id: session.id },
      data: {
        ctx_prefill: body.prefill as Record<string, Record<string, string>>,
        m2_token: null,
        m2_token_expires_at: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/m2-link/[token]]", err);
    return NextResponse.json(
      { ok: false, error: "Angaben konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
