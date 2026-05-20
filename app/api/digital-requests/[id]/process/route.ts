/**
 * Phase B Schritt 4: POST /api/digital-requests/[id]/process
 *
 * Aus einer gespeicherten DigitalRequest wird ein individueller
 * PatientQuestionnaireSession-Link erzeugt und per Mail an den Einreicher
 * geschickt. Nach erfolgreichem Versand wird die DigitalRequest auf
 * `status = "sent"` gesetzt und mit der erzeugten Session verknüpft.
 *
 * Rechte: OWNER / ADMIN / USER (via requireQuestionnaireSendAccess).
 * INBOX_ONLY → 403. Nicht eingeloggt → 401.
 *
 * Fehlerverhalten:
 *   - 404: Anfrage unbekannt oder fremde Practice.
 *   - 409: Anfrage bereits "sent" oder "closed".
 *   - 400: patient_reference fehlt | selected_block_ids fehlen / ungültig |
 *          submitter_email fehlt.
 *   - 500 (mail_failed): Mail-Versand schlug fehl; DigitalRequest wird
 *          NICHT auf "sent" gesetzt.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireSendAccess } from "@/lib/authz";
import { getOwnershipFilter } from "@/lib/digitalRequests/practiceScope";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { sendDigitalRequestTokenEmail } from "@/lib/mail/sendDigitalRequestTokenEmail";

/** Status-Werte, bei denen kein erneuter Prozess erlaubt ist. */
const TERMINAL_STATUSES = new Set(["sent", "closed"]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireQuestionnaireSendAccess(req);
  if (error) return error;

  const { id } = await ctx.params;

  // --- DigitalRequest laden ---
  const dr = await prisma.digitalRequest.findFirst({
    where: { id, ...getOwnershipFilter(account), deleted_at: null },
    select: {
      id: true,
      status: true,
      submitter_email: true,
      patient_reference: true,
      selected_block_ids: true,
      birth_date_hash: true,
      owner_account_id: true,
      owner_practice_id: true,
      owner_practice: {
        select: {
          id: true,
          name: true,
          message_signature: true,
        },
      },
    },
  });

  if (!dr) {
    return NextResponse.json(
      { ok: false, error: "Anfrage nicht gefunden." },
      { status: 404 },
    );
  }

  // --- Terminal-Status prüfen (409) ---
  if (TERMINAL_STATUSES.has(dr.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Anfrage hat bereits den Status "${dr.status}" und kann nicht erneut verarbeitet werden.`,
      },
      { status: 409 },
    );
  }

  // --- submitter_email muss vorhanden sein (sollte immer der Fall sein) ---
  if (!dr.submitter_email) {
    return NextResponse.json(
      { ok: false, error: "Keine Empfänger-E-Mail vorhanden." },
      { status: 400 },
    );
  }

  // --- patient_reference muss vorhanden sein (400) ---
  if (!dr.patient_reference) {
    return NextResponse.json(
      { ok: false, error: "Patientenreferenz fehlt. Bitte zuerst die Anfrage ausfüllen." },
      { status: 400 },
    );
  }

  // --- selected_block_ids muss Array mit ≥1 gültigem Block sein (400) ---
  const rawBlockIds = dr.selected_block_ids;
  if (
    !Array.isArray(rawBlockIds) ||
    rawBlockIds.length === 0
  ) {
    return NextResponse.json(
      { ok: false, error: "Keine Block-IDs ausgewählt. Bitte zuerst die Anfrage ausfüllen." },
      { status: 400 },
    );
  }
  const selectedBlockIds = rawBlockIds as string[];
  const invalidIds = selectedBlockIds.filter((bid) => !(bid in BLOCK_CATALOG));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Ungültige Block-IDs in der Anfrage.",
        invalid_ids: invalidIds,
      },
      { status: 400 },
    );
  }

  // --- Session erzeugen ---
  const origin = req.nextUrl.origin;
  const { sessionId, tokenLink } = await createQuestionnaireSession({
    selectedBlockIds,
    patientReference: dr.patient_reference,
    patientLanguage: "de",
    ownerAccountId: dr.owner_account_id,
    ownerPracticeId: dr.owner_practice_id ?? null,
    birthDateHash: dr.birth_date_hash ?? null,
    origin,
  });

  // --- Mail senden (vor DB-Update; bei Fehler kein Status-Update) ---
  const practiceName = dr.owner_practice?.name ?? "Ihre Praxis";
  const practiceSignature = dr.owner_practice?.message_signature ?? null;

  try {
    await sendDigitalRequestTokenEmail({
      to: dr.submitter_email,
      questionnaireUrl: tokenLink,
      practiceName,
      practiceSignature,
      practiceId: dr.owner_practice_id ?? null,
    });
  } catch (mailErr) {
    console.error("[digital-request/process] Mailversand fehlgeschlagen", mailErr);
    return NextResponse.json(
      { ok: false, error: "Mailversand fehlgeschlagen." },
      { status: 500 },
    );
  }

  // --- DigitalRequest auf sent setzen und Session verknüpfen ---
  await prisma.digitalRequest.update({
    where: { id: dr.id },
    data: {
      status: "sent",
      questionnaire_session_id: sessionId,
      sent_at: new Date(),
    },
  });

  return NextResponse.json({ ok: true, status: "sent", sessionId });
}
