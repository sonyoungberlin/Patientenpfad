import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePatientCommunicationAccess } from "@/lib/authz";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { buildQuestionnaireQuestions } from "@/lib/questionnaire/buildQuestionnaireQuestions";
import {
  isBlockEnReady,
  normalizeQuestionnaireLanguage,
} from "@/lib/questionnaire/i18n";
import { getCreateOwnershipData } from "@/lib/questionnaire/practiceScope";

const IS_DEV = process.env.NODE_ENV === "development";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function POST(req: NextRequest) {
  try {
    const { account, error } = await requirePatientCommunicationAccess(req);
    if (error) return error;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Ungültiges JSON." },
        { status: 400 },
      );
    }

    // Validate selected_block_ids
    const rawBlockIds = body.selected_block_ids;
    if (
      !Array.isArray(rawBlockIds) ||
      rawBlockIds.length === 0 ||
      !rawBlockIds.every((id) => typeof id === "string")
    ) {
      return NextResponse.json(
        { ok: false, error: "selected_block_ids muss ein nicht-leeres Array von Strings sein." },
        { status: 400 },
      );
    }

    const selectedBlockIds = (rawBlockIds as string[]).filter(
      (id) => id in BLOCK_CATALOG,
    );
    if (selectedBlockIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Keine gültigen Block-IDs angegeben." },
        { status: 400 },
      );
    }

    // Patientennummer / Referenz ist verpflichtend, damit der eingehende
    // Fragebogen später eindeutig zugeordnet werden kann. Leerzeichen allein
    // zählen nicht (getrimmt prüfen).
    const patientReference =
      typeof body.patient_reference === "string" && body.patient_reference.trim() !== ""
        ? body.patient_reference.trim()
        : null;

    if (!patientReference) {
      return NextResponse.json(
        {
          ok: false,
          error: "Patientennummer / Referenz ist erforderlich.",
        },
        { status: 400 },
      );
    }

    const inquirySessionId =
      typeof body.inquiry_session_id === "string" && body.inquiry_session_id.trim() !== ""
        ? body.inquiry_session_id.trim()
        : null;

    // Optionale Sprache der Patientensicht. Whitelist "de" | "en", Default "de".
    // Praxis-/interne Sichten ignorieren dieses Feld.
    const patientLanguage = normalizeQuestionnaireLanguage(body.language);

    // Variante A (keine gemischten Sprachen): bei language="en" dürfen
    // nur Blöcke versendet werden, deren Block- und Fragenfelder
    // vollständig übersetzt sind. Sonst Hard-Reject mit Liste der
    // problematischen Blöcke, damit die UI gezielt korrigieren kann.
    if (patientLanguage === "en") {
      const notEnReady = selectedBlockIds.filter((id) => !isBlockEnReady(id));
      if (notEnReady.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Einige ausgewählte Blöcke sind nicht vollständig auf Englisch übersetzt. " +
              "Bitte entfernen Sie sie oder wählen Sie Deutsch als Sprache.",
            not_en_ready_block_ids: notEnReady,
          },
          { status: 400 },
        );
      }
    }

    // Build deduplicated questions
    const deduplicatedQuestions = buildQuestionnaireQuestions(selectedBlockIds);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.patientQuestionnaireSession.create({
      data: {
        token,
        token_expires_at: expiresAt,
        // Phase P3b: Doppelschreiben — `owner_account_id` immer,
        // `owner_practice_id` zusätzlich, falls eine `current_practice`
        // im Session-Account vorhanden ist.
        ...getCreateOwnershipData(account),
        patient_reference: patientReference,
        inquiry_session_id: inquirySessionId,
        selected_block_ids: selectedBlockIds as Prisma.InputJsonValue,
        deduplicated_questions: deduplicatedQuestions as unknown as Prisma.InputJsonValue,
        patient_language: patientLanguage,
        status: "pending",
      },
    });

    const origin = req.nextUrl.origin;
    const link = `${origin}/q/${token}`;

    return NextResponse.json({ ok: true, link });
  } catch (err) {
    // Always log the full error server-side for observability.
    console.error("questionnaire create failed", err);

    // Prisma known errors: include the error code in every environment
    // (e.g. P2022 = column missing → migration not applied) so the issue
    // is diagnosable from the browser console without server-log access.
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          ok: false,
          error: IS_DEV
            ? `Prisma ${err.code}: ${err.message}`
            : "Fragebogen konnte nicht erstellt werden.",
          prismaCode: err.code,
        },
        { status: 500 },
      );
    }

    if (IS_DEV) {
      if (err instanceof Prisma.PrismaClientInitializationError) {
        return NextResponse.json(
          {
            ok: false,
            error: `Prisma init error: ${err.message}`,
            prismaCode: err.errorCode,
          },
          { status: 500 },
        );
      }
      if (err instanceof Error) {
        return NextResponse.json(
          { ok: false, error: err.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "Fragebogen konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
