/**
 * POST /api/digital-requests/[id]/reject
 *
 * Lehnt eine DigitalRequest ab: sendet eine Standard-Ablehnungs-E-Mail
 * und setzt den Status auf "rejected". Der Status wird nur gesetzt,
 * wenn der Mailversand erfolgreich war.
 *
 * Rechte: OWNER / ADMIN / USER (via requireQuestionnaireSendAccess).
 * INBOX_ONLY → 403. Nicht eingeloggt → 401.
 *
 * Fehlerverhalten:
 *   - 404: Anfrage unbekannt oder fremde Practice.
 *   - 409: Anfrage hat bereits einen terminalen Status
 *          ("sent" | "closed" | "rejected").
 *   - 400: submitter_email fehlt.
 *   - 500 (mail_failed): Mailversand schlug fehl; DigitalRequest wird
 *          NICHT auf "rejected" gesetzt.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireSendAccess } from "@/lib/authz";
import { getOwnershipFilter } from "@/lib/digitalRequests/practiceScope";
import { sendDigitalRequestRejectionEmail } from "@/lib/mail/sendDigitalRequestRejectionEmail";

/** Status-Werte, bei denen keine Ablehnung mehr möglich ist. */
const TERMINAL_STATUSES = new Set(["sent", "closed", "rejected"]);

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
        error: `Anfrage hat bereits den Status "${dr.status}" und kann nicht abgelehnt werden.`,
      },
      { status: 409 },
    );
  }

  // --- submitter_email muss vorhanden sein (400) ---
  if (!dr.submitter_email) {
    return NextResponse.json(
      { ok: false, error: "Keine Empfänger-E-Mail vorhanden." },
      { status: 400 },
    );
  }

  // --- Mail senden (vor DB-Update; bei Fehler kein Status-Update) ---
  const practiceName = dr.owner_practice?.name ?? "Ihre Praxis";
  const practiceSignature = dr.owner_practice?.message_signature ?? null;

  try {
    await sendDigitalRequestRejectionEmail({
      to: dr.submitter_email,
      practiceName,
      practiceSignature,
      practiceId: dr.owner_practice_id ?? null,
    });
  } catch (mailErr) {
    console.error("[digital-request/reject] Mailversand fehlgeschlagen", mailErr);
    return NextResponse.json(
      { ok: false, error: "Mailversand fehlgeschlagen." },
      { status: 500 },
    );
  }

  // --- DigitalRequest auf rejected setzen ---
  await prisma.digitalRequest.update({
    where: { id: dr.id },
    data: { status: "rejected" },
  });

  return NextResponse.json({ ok: true, status: "rejected" });
}
