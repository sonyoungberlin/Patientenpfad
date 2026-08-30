import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccess } from "@/lib/authz";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { OFFICE_BLOCK_CATALOG } from "@/lib/questionnaire/officeBlockCatalog";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { account, error } = await requireOfficeQuestionnaireAccess(req);
  if (error) return error;

  const session = await prisma.patientQuestionnaireSession.findUnique({
    where: { id },
    select: {
      owner_account_id: true,
      owner_practice_id: true,
      context: true,
      status: true,
      patient_reference: true,
      submitted_at: true,
      submitted_by: true,
      selected_block_ids: true,
      deduplicated_questions: true,
      answers: true,
      deleted_at: true,
      pdf_downloaded_at: true,
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
    return new Response(JSON.stringify({ ok: false, error: "Session nicht gefunden." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (session.status !== "completed") {
    return new Response(
      JSON.stringify({ ok: false, error: "PDF nur für abgeschlossene Fragebögen verfügbar." }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }

  const { bytes, filename } = await buildQuestionnairePdfBytes(
    { ...session, source: "internal_link", practice_form: null },
    {
      title: "Fragebogen – Bewerberangaben",
      referenceLabel: "Referenz",
      blockCatalog: OFFICE_BLOCK_CATALOG,
    },
  );

  if (session.pdf_downloaded_at == null) {
    try {
      await prisma.patientQuestionnaireSession.update({
        where: { id },
        data: { pdf_downloaded_at: new Date() },
      });
    } catch (err) {
      console.error("[GET office-cases/questionnaire/[id]/pdf] mark_downloaded_failed", {
        sessionId: id,
        message: err instanceof Error ? err.message : "UnknownError",
      });
    }
  }

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
