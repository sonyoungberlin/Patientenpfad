import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCasesAccess } from "@/lib/authz";
import { canAccessCaseSession } from "@/lib/cases/practiceScope";
import type { ActiveCheckpoint } from "@/lib/types";
import { selectM2Questionnaire, type M2QuestionnaireMode } from "@/lib/logic/m2QuestionnaireSelection";
import { buildM2PrintPdf, type OfficeM2PrintSection } from "@/lib/office/m2PrintPdf";

function readMode(value: string | null): M2QuestionnaireMode | null {
  return value === "mfa" || value === "conversation" ? value : null;
}

function buildPrintSections(
  checkpoints: ActiveCheckpoint[],
  mode: M2QuestionnaireMode,
): OfficeM2PrintSection[] {
  const selection = selectM2Questionnaire(checkpoints, mode);
  const sections: OfficeM2PrintSection[] = [];

  for (const checkpoint of selection.visibleCheckpoints) {
    if (selection.k13EmbeddedInK12 && checkpoint.id === "K13") continue;

    const questions = selection.questionsByCheckpoint[checkpoint.id] ?? [];
    if (checkpoint.id === "K12" && selection.k12K13Groups.length > 0) {
      sections.push({
        title: checkpoint.title,
        checkpoints: selection.k12K13Groups.map((group) => ({
          title: group.title,
          questions: group.items.map(({ question }) => ({ text: question.text })),
        })),
      });
      continue;
    }

    if (questions.length > 0) {
      sections.push({
        title: null,
        checkpoints: [{
          title: checkpoint.title,
          questions: questions.map((question) => ({ text: question.text })),
        }],
      });
    }

    if (
      mode === "conversation" &&
      checkpoint.id === "K12" &&
      selection.k13EmbeddedInK12 &&
      selection.k12K13Groups.length === 0 &&
      selection.k13Checkpoint
    ) {
      const k13Questions = selection.questionsByCheckpoint.K13 ?? [];
      if (k13Questions.length > 0) {
        sections.push({
          title: "Geriatrische Zusatzfragen",
          checkpoints: [{
            title: "",
            questions: k13Questions.map((question) => ({ text: question.text })),
          }],
        });
      }
    }
  }

  return sections;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireCasesAccess(req);
  if (error) return error;

  const mode = readMode(req.nextUrl.searchParams.get("mode"));
  if (!mode) {
    return NextResponse.json(
      { ok: false, error: "Ungültiger M2-Druckmodus." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const session = await prisma.caseSession.findUnique({
    where: { id },
    select: {
      owner_account_id: true,
      owner_practice_id: true,
      active_checkpoints: true,
      doctor_confirmed: true,
      clinical_status: true,
    },
  });

  if (!session || !canAccessCaseSession(account, session)) {
    return NextResponse.json({ ok: false, error: "Fall nicht gefunden." }, { status: 404 });
  }
  if (session.doctor_confirmed || session.clinical_status === "confirmed") {
    return NextResponse.json(
      { ok: false, error: "Der Fall ist nicht mehr in M2 verfügbar." },
      { status: 409 },
    );
  }

  const checkpoints = Array.isArray(session.active_checkpoints)
    ? session.active_checkpoints as ActiveCheckpoint[]
    : [];
  const modeTitle = mode === "mfa" ? "M2 – MFA-Vorbereitung" : "M2 – Patientengespräch";
  const bytes = await buildM2PrintPdf({
    title: modeTitle,
    sections: buildPrintSections(checkpoints, mode),
  });
  const filename = mode === "mfa"
    ? "M2-MFA-Vorbereitung.pdf"
    : "M2-Patientengespraech.pdf";

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}