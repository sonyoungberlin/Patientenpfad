/**
 * POST /api/office-cases/applications/[id]/reject
 *
 * Lehnt eine Bewerbungsanfrage ab: sendet Ablehnungs-E-Mail (variant = "office")
 * und setzt status → "rejected". Status wird nur gesetzt, wenn Mail erfolgreich.
 *
 * Rechte: requireOfficeQuestionnaireAccess.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeApplicationsAccess } from "@/lib/authz";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { sendDigitalRequestRejectionEmail } from "@/lib/mail/sendDigitalRequestRejectionEmail";

const TERMINAL_STATUSES = new Set(["sent", "closed", "rejected"]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireOfficeApplicationsAccess(req);
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
        error: `Anfrage hat bereits den Status "${dr.status}".`,
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

  const practiceName = dr.owner_practice?.name ?? "Ihre Praxis";
  const practiceSignature = dr.owner_practice?.message_signature ?? null;

  try {
    await sendDigitalRequestRejectionEmail({
      to: dr.submitter_email,
      practiceName,
      practiceSignature,
      practiceId: dr.owner_practice_id ?? null,
      variant: "office",
    });
  } catch (mailErr) {
    console.error(
      "[office-applications/reject] Mailversand fehlgeschlagen",
      mailErr,
    );
    return NextResponse.json(
      { ok: false, error: "Mailversand fehlgeschlagen." },
      { status: 500 },
    );
  }

  await prisma.digitalRequest.update({
    where: { id: dr.id },
    data: { status: "rejected" },
  });

  return NextResponse.json({ ok: true });
}
