import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePatientCommunicationAccess } from "@/lib/authz";
import { ownsSession } from "@/lib/questionnaire/practiceScope";
import { isQuestionnaireVisibleToPractice } from "@/lib/websiteForms/practiceVisibility";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requirePatientCommunicationAccess(req);
    if (error) return error;

    const { id } = await params;

    const session = await prisma.patientQuestionnaireSession.findUnique({
      where: { id },
      select: {
        owner_account_id: true,
        owner_practice_id: true,
        source: true,
        status: true,
        confirmed_at: true,
      },
    });

    if (
      !session ||
      !ownsSession(account, session) ||
      !isQuestionnaireVisibleToPractice(session)
    ) {
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
