import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { buildQuestionnaireQuestions } from "@/lib/questionnaire/buildQuestionnaireQuestions";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function POST(req: NextRequest) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
        { status: 401 },
      );
    }
    if (!account.is_approved) {
      return NextResponse.json(
        { ok: false, error: "Account nicht freigeschaltet." },
        { status: 403 },
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

    // Optional fields
    const patientReference =
      typeof body.patient_reference === "string" && body.patient_reference.trim() !== ""
        ? body.patient_reference.trim()
        : null;

    const inquirySessionId =
      typeof body.inquiry_session_id === "string" && body.inquiry_session_id.trim() !== ""
        ? body.inquiry_session_id.trim()
        : null;

    // Build deduplicated questions
    const deduplicatedQuestions = buildQuestionnaireQuestions(selectedBlockIds);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.patientQuestionnaireSession.create({
      data: {
        token,
        token_expires_at: expiresAt,
        owner_account_id: account.id,
        patient_reference: patientReference,
        inquiry_session_id: inquirySessionId,
        selected_block_ids: selectedBlockIds as Prisma.InputJsonValue,
        deduplicated_questions: deduplicatedQuestions as unknown as Prisma.InputJsonValue,
        status: "pending",
      },
    });

    const origin = req.nextUrl.origin;
    const link = `${origin}/q/${token}`;

    return NextResponse.json({ ok: true, link });
  } catch (err) {
    console.error("[api/questionnaire]", err);
    return NextResponse.json(
      { ok: false, error: "Fragebogen konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
