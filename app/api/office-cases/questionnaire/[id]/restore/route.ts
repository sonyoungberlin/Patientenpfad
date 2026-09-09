import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccess } from "@/lib/authz";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { questionnaireTrashCutoff } from "@/lib/questionnaire/lifecycle";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireOfficeQuestionnaireAccess(req);
    if (error) return error;

    const { id } = await params;
    const trashCutoff = questionnaireTrashCutoff(new Date());
    const session = await prisma.patientQuestionnaireSession.findUnique({
      where: { id },
      select: {
        owner_account_id: true,
        owner_practice_id: true,
        context: true,
        status: true,
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
      session.status !== "completed" ||
      session.deleted_at == null ||
      session.deleted_at <= trashCutoff ||
      !ownedByPractice
    ) {
      return NextResponse.json(
        { ok: false, error: "Fragebogen nicht gefunden." },
        { status: 404 },
      );
    }

    const result = await prisma.patientQuestionnaireSession.updateMany({
      where: {
        id,
        context: "office",
        status: "completed",
        deleted_at: { gt: trashCutoff },
      },
      data: { deleted_at: null },
    });

    if (result.count !== 1) {
      return NextResponse.json(
        { ok: false, error: "Fragebogen nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST office-cases/questionnaire/[id]/restore]", {
      message: err instanceof Error ? err.message : "UnknownError",
    });
    return NextResponse.json(
      { ok: false, error: "Fragebogen konnte nicht wiederhergestellt werden." },
      { status: 500 },
    );
  }
}