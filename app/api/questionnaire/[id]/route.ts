import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canSeeQuestionnaire, requireApprovedAccount } from "@/lib/authz";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireApprovedAccount(req);
    if (error) return error;

    const { id } = await params;

    const session = await prisma.patientQuestionnaireSession.findUnique({
      where: { id },
      select: { owner_account_id: true },
    });

    if (!session || !canSeeQuestionnaire(account, session)) {
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
