/**
 * POST /api/office-cases/applications/[id]/process
 *
 * Erstellt aus einer Bewerbungsanfrage einen Fragebogen-Link und versendet
 * ihn per E-Mail (variant = "office").
 *
 * patientReference wird automatisch aus submitter_name befüllt.
 *
 * Rechte: requireOfficeQuestionnaireAccess.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccess } from "@/lib/authz";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { OFFICE_BLOCK_CATALOG } from "@/lib/questionnaire/officeBlockCatalog";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { sendDigitalRequestTokenEmail } from "@/lib/mail/sendDigitalRequestTokenEmail";

const TERMINAL_STATUSES = new Set(["sent", "closed", "rejected"]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireOfficeQuestionnaireAccess(req);
  if (error) return error;

  const { id } = await ctx.params;

  const dr = await prisma.digitalRequest.findFirst({
    where: {
      id,
      ...getOfficeOwnershipFilter(account),
      request_type: "office",
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      submitter_email: true,
      submitter_name: true,
      selected_block_ids: true,
      owner_account_id: true,
      owner_practice_id: true,
      owner_practice: {
        select: { id: true, name: true, message_signature: true },
      },
    },
  });

  if (!dr) {
    return NextResponse.json(
      { ok: false, error: "Anfrage nicht gefunden." },
      { status: 404 },
    );
  }

  if (TERMINAL_STATUSES.has(dr.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Anfrage hat bereits den Status "${dr.status}" und kann nicht erneut verarbeitet werden.`,
      },
      { status: 409 },
    );
  }

  if (!dr.submitter_email) {
    return NextResponse.json(
      { ok: false, error: "Keine Empfänger-E-Mail vorhanden." },
      { status: 400 },
    );
  }

  // --- selected_block_ids prüfen ---
  const rawBlockIds = dr.selected_block_ids;
  if (!Array.isArray(rawBlockIds) || rawBlockIds.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Keine Block-IDs ausgewählt. Bitte zuerst die Bewerbungsanfrage ausfüllen.",
      },
      { status: 400 },
    );
  }
  const selectedBlockIds = rawBlockIds as string[];
  const invalidIds = selectedBlockIds.filter(
    (bid) => !(bid in OFFICE_BLOCK_CATALOG),
  );
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Block-IDs in der Anfrage.", invalid_ids: invalidIds },
      { status: 400 },
    );
  }

  // --- Session erzeugen (patientReference = submitter_name) ---
  const origin = req.nextUrl.origin;
  const { sessionId, tokenLink } = await createQuestionnaireSession({
    selectedBlockIds,
    patientReference: dr.submitter_name,
    patientLanguage: "de",
    ownerAccountId: dr.owner_account_id,
    ownerPracticeId: dr.owner_practice_id ?? null,
    birthDateHash: null,
    origin,
    context: "office",
  });

  const practiceName = dr.owner_practice?.name ?? "Ihre Praxis";
  const practiceSignature = dr.owner_practice?.message_signature ?? null;

  try {
    await sendDigitalRequestTokenEmail({
      to: dr.submitter_email,
      questionnaireUrl: tokenLink,
      practiceName,
      practiceSignature,
      practiceId: dr.owner_practice_id ?? null,
      variant: "office",
    });
  } catch (mailErr) {
    console.error(
      "[office-applications/process] Mailversand fehlgeschlagen",
      mailErr,
    );
    return NextResponse.json(
      { ok: false, error: "Mailversand fehlgeschlagen." },
      { status: 500 },
    );
  }

  await prisma.digitalRequest.update({
    where: { id: dr.id },
    data: {
      status: "sent",
      questionnaire_session_id: sessionId,
      sent_at: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
