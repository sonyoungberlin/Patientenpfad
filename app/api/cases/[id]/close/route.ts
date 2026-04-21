import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

export async function PATCH(
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
      select: { owner_account_id: true, doctor_confirmed: true },
    });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json({ ok: false, error: "Fall nicht gefunden." }, { status: 404 });
    }

    if (session.doctor_confirmed) {
      // Already confirmed – idempotent OK, do not overwrite the timestamp.
      return NextResponse.json({ ok: true, already_confirmed: true });
    }

    await prisma.caseSession.update({
      where: { id },
      data: {
        stage_status: "CLOSED",
        doctor_confirmed: true,
        doctor_confirmed_at: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[cases/[id]/close]", { name: err.name, message: err.message });
    } else {
      console.error("[cases/[id]/close]", "UnknownError");
    }
    return NextResponse.json({ ok: false, error: "Failed to close case" }, { status: 500 });
  }
}
