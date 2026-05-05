import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { normalizeQuestionnaireLanguage } from "@/lib/questionnaire/i18n";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const session = await prisma.patientQuestionnaireSession.findUnique({
      where: { token },
      select: {
        id: true,
        token_expires_at: true,
        status: true,
        deduplicated_questions: true,
        patient_language: true,
        deleted_at: true,
      },
    });

    if (!session || !session.token_expires_at || session.deleted_at != null) {
      return NextResponse.json(
        { ok: false, error: "Link ungültig oder abgelaufen." },
        { status: 404 },
      );
    }

    if (session.token_expires_at < new Date()) {
      return NextResponse.json(
        { ok: false, error: "Link ungültig oder abgelaufen." },
        { status: 410 },
      );
    }

    if (session.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "Dieser Fragebogen wurde bereits ausgefüllt." },
        { status: 409 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Ungültiges JSON." },
        { status: 400 },
      );
    }

    if (
      !body?.answers ||
      typeof body.answers !== "object" ||
      Array.isArray(body.answers)
    ) {
      return NextResponse.json(
        { ok: false, error: "answers muss ein Objekt sein." },
        { status: 400 },
      );
    }

    // Validate answers: only known questionIds from the session's deduplicated_questions
    const deduplicatedQuestions = Array.isArray(session.deduplicated_questions)
      ? (session.deduplicated_questions as Array<{ id: string }>)
      : [];

    const sanitizedAnswers = sanitizeAnswers(
      body.answers,
      deduplicatedQuestions,
      normalizeQuestionnaireLanguage(session.patient_language),
    );

    await prisma.patientQuestionnaireSession.update({
      where: { id: session.id },
      data: {
        answers: sanitizedAnswers as unknown as Prisma.InputJsonValue,
        status: "completed",
        submitted_at: new Date(),
        token: null,
        token_expires_at: null,
        identity_gate_completed_at: new Date(),
        identity_gate_method: "dob_lastname3",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/q/[token]]", err);
    return NextResponse.json(
      { ok: false, error: "Angaben konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
