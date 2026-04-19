import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
    }
    if (!account.is_approved) {
      return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
    }

    const { id } = await params;

    const session = await prisma.caseSession.findUnique({ where: { id } });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, case: session });
  } catch (err) {
    console.error("[cases/[id]]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load case session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
    }
    if (!account.is_approved) {
      return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
    }

    const { id } = await params;

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: { owner_account_id: true },
    });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json({ ok: false, error: "Fall nicht gefunden." }, { status: 404 });
    }

    await prisma.caseSession.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[DELETE cases/[id]]", { name: err.name, message: err.message });
    } else {
      console.error("[DELETE cases/[id]]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Fall konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
