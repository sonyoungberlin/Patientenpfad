import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccess } from "@/lib/authz";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireOfficeQuestionnaireAccess(req);
    if (error) return error;

    const { id } = await params;

    const session = await prisma.patientQuestionnaireSession.findUnique({
      where: { id },
      select: {
        owner_account_id: true,
        owner_practice_id: true,
        context: true,
        deleted_at: true,
      },
    });

    const ownerFilter = getOfficeOwnershipFilter(account);
    const ownedByPractice =
      "owner_practice_id" in ownerFilter
        ? session?.owner_practice_id === ownerFilter.owner_practice_id
        : session?.owner_account_id === ownerFilter.owner_account_id;

    if (
      !session ||
      session.context !== "office" ||
      session.deleted_at != null ||
      !ownedByPractice
    ) {
      return NextResponse.json(
        { ok: false, error: "Fragebogen nicht gefunden." },
        { status: 404 },
      );
    }

    await prisma.patientQuestionnaireSession.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[DELETE office-cases/questionnaire/[id]]", { name: err.name, message: err.message });
    } else {
      console.error("[DELETE office-cases/questionnaire/[id]]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Fragebogen konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
