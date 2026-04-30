import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

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

    const session = await prisma.patientQuestionnaireSession.findUnique({
      where: { id },
      select: { owner_account_id: true },
    });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json({ ok: false, error: "Fragebogen nicht gefunden." }, { status: 404 });
    }

    await prisma.patientQuestionnaireSession.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[DELETE questionnaire/[id]]", { name: err.name, message: err.message });
    } else {
      console.error("[DELETE questionnaire/[id]]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Fragebogen konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
