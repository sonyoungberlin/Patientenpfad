import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { normalizeQuestionnaireLanguage } from "@/lib/questionnaire/i18n";
import {
  answerCharactersErrorMessage,
  validateAnswerCharacters,
} from "@/lib/questionnaire/validateAnswerCharacters";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import {
  parseConditionalRules,
  computeVisibleQuestionIds,
  computeVisibleBlockIds,
} from "@/lib/questionnaire/conditionalLogic";
import { computeAllDerivedValues } from "@/lib/questionnaire/derivedValues";
import { buildOptionsByQuestionId } from "@/lib/questionnaire/multiSelect";
import { isConfirmedAnswer } from "@/lib/questionnaire/confirmation";

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
        frozen_blocks: true,
        frozen_conditional_rules: true,
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
      ? (session.deduplicated_questions as Array<{ id: string; type?: import("@/lib/questionnaire/blockCatalog").QuestionType }>)
      : [];

    // Phase 4: frozen QuestionDefinitions für Sanitizer aufbauen (wenn vorhanden)
    const frozenBlocks = parseFrozenBlocks(session.frozen_blocks);
    const frozenQuestionMap: ReadonlyMap<string, QuestionDefinition> | undefined =
      frozenBlocks
        ? new Map(frozenBlocks.flatMap((b) => b.questions.map((q) => [q.id, q] as const)))
        : undefined;

    // Zeichenvalidierung für Freitextantworten (text/textarea). Greift vor
    // dem Sanitisieren/Speichern, damit nicht-lateinische Eingaben (z. B.
    // kyrillisch, arabisch, CJK, Emojis) unabhängig vom Client zuverlässig
    // abgewiesen werden. Sprache der Fehlermeldung folgt patient_language.
    const language = normalizeQuestionnaireLanguage(session.patient_language);
    const charCheck = validateAnswerCharacters(body.answers, deduplicatedQuestions);
    if (!charCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: answerCharactersErrorMessage(language),
          invalidQuestionIds: charCheck.invalidQuestionIds,
        },
        { status: 400 },
      );
    }

    const sanitizedAnswers = sanitizeAnswers(
      body.answers,
      deduplicatedQuestions,
      language,
      frozenQuestionMap,
    );

    // Phase 5: Derived Values serverseitig aus bereinigten Antworten berechnen.
    // Clientseitige Werte werden nie vertraut.
    const derivedValues = computeAllDerivedValues(sanitizedAnswers);

    // Phase 4+5: Nur Antworten sichtbarer Fragen speichern (Conditional Logic + Derived Values).
    const frozenConditionalRules = parseConditionalRules(session.frozen_conditional_rules);
    let visibleAnswerIds: Set<string>;
    const optionsByQuestionId = buildOptionsByQuestionId(
      frozenBlocks
        ? frozenBlocks.flatMap((block) => block.questions)
        : deduplicatedQuestions,
    );

    if (frozenBlocks) {
      const visibleBlockIds = computeVisibleBlockIds(
        frozenConditionalRules,
        frozenBlocks,
        sanitizedAnswers,
        derivedValues,
      );
      visibleAnswerIds = new Set<string>();
      for (const block of frozenBlocks) {
        if (!visibleBlockIds.has(block.id)) continue;
        const blockQIds = block.questions.map((q) => q.id);
        const visibleQIds = computeVisibleQuestionIds(
          frozenConditionalRules,
          blockQIds,
          sanitizedAnswers,
          derivedValues,
          optionsByQuestionId,
        );
        for (const id of visibleQIds) visibleAnswerIds.add(id);
      }
    } else {
      const allQIds = deduplicatedQuestions.map((q) => q.id);
      visibleAnswerIds = computeVisibleQuestionIds(
        frozenConditionalRules,
        allQIds,
        sanitizedAnswers,
        derivedValues,
        optionsByQuestionId,
      );
    }

    const filteredAnswers: Record<string, string> = Object.fromEntries(
      Object.entries(sanitizedAnswers).filter(([id]) => visibleAnswerIds.has(id)),
    );

    const snapshotQuestions: QuestionDefinition[] = frozenBlocks
      ? frozenBlocks.flatMap((block) => block.questions)
      : (deduplicatedQuestions as QuestionDefinition[]);
    const missingConfirmation = snapshotQuestions.some(
      (question) =>
        question.type === "confirmation" &&
        !isConfirmedAnswer(filteredAnswers[question.id]),
    );
    if (missingConfirmation) {
      return NextResponse.json(
        {
          ok: false,
          error:
            language === "en"
              ? "Please confirm all required statements."
              : "Bitte bestätigen Sie alle erforderlichen Erklärungen.",
        },
        { status: 400 },
      );
    }

    await prisma.patientQuestionnaireSession.update({
      where: { id: session.id },
      data: {
        answers: filteredAnswers as unknown as Prisma.InputJsonValue,
        status: "completed",
        submitted_at: new Date(),
        token: null,
        token_expires_at: null,
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
