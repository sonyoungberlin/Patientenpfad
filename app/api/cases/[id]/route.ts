import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCasesAccess } from "@/lib/authz";
import { canAccessCaseSession } from "@/lib/cases/practiceScope";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { account, error } = await requireCasesAccess(req);
    if (error) return error;

    const { id } = await params;

    const session = await prisma.caseSession.findUnique({ where: { id } });

    if (!session || !canAccessCaseSession(account, session)) {
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
    const { account, error } = await requireCasesAccess(req);
    if (error) return error;

    const { id } = await params;

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: { owner_account_id: true, owner_practice_id: true },
    });

    if (!session || !canAccessCaseSession(account, session)) {
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
