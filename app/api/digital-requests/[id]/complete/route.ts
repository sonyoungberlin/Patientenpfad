import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDigitalRequestWorkAccess } from "@/lib/authz";
import { getOwnershipFilter } from "@/lib/digitalRequests/practiceScope";
import { sendDigitalRequestCompletionEmail } from "@/lib/mail/sendDigitalRequestCompletionEmail";

const MAX_COMPLETION_MESSAGE_LENGTH = 1000;
const OPEN_STATUSES = ["new", "in_review"];
const COMPLETION_CLAIM_LEASE_MS = 10 * 60 * 1000;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireDigitalRequestWorkAccess(req);
  if (error) return error;

  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON." },
      { status: 400 },
    );
  }

  if (typeof body.completion_message !== "string") {
    return NextResponse.json(
      { ok: false, error: "Eine Abschlussnachricht ist erforderlich." },
      { status: 400 },
    );
  }
  const completionMessage = body.completion_message.trim();
  if (!completionMessage) {
    return NextResponse.json(
      { ok: false, error: "Die Abschlussnachricht darf nicht leer sein." },
      { status: 400 },
    );
  }
  if (completionMessage.length > MAX_COMPLETION_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: `Die Abschlussnachricht darf höchstens ${MAX_COMPLETION_MESSAGE_LENGTH} Zeichen enthalten.`,
      },
      { status: 400 },
    );
  }

  const dr = await prisma.digitalRequest.findFirst({
    where: {
      id,
      ...getOwnershipFilter(account),
      request_type: "patient",
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      submitter_email: true,
      owner_practice_id: true,
      owner_practice: {
        select: { name: true, message_signature: true },
      },
    },
  });

  if (!dr) {
    return NextResponse.json(
      { ok: false, error: "Anfrage nicht gefunden." },
      { status: 404 },
    );
  }

  if (!OPEN_STATUSES.includes(dr.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Anfrage hat bereits den Status "${dr.status}" und kann nicht abgeschlossen werden.`,
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

  const claimedAt = new Date();
  const staleClaimCutoff = new Date(
    claimedAt.getTime() - COMPLETION_CLAIM_LEASE_MS,
  );

  // Claim only the open, unclaimed request or a claim whose lease expired.
  const claim = await prisma.digitalRequest.updateMany({
    where: {
      id: dr.id,
      ...getOwnershipFilter(account),
      request_type: "patient",
      deleted_at: null,
      status: { in: OPEN_STATUSES },
      completion_message: null,
      completed_at: null,
      OR: [
        { completion_claimed_at: null },
        { completion_claimed_at: { lt: staleClaimCutoff } },
      ],
    },
    data: { completion_claimed_at: claimedAt },
  });

  if (claim.count !== 1) {
    return NextResponse.json(
      { ok: false, error: "Die Anfrage wird bereits verarbeitet oder ist abgeschlossen." },
      { status: 409 },
    );
  }

  try {
    await sendDigitalRequestCompletionEmail({
      to: dr.submitter_email,
      completionMessage,
      practiceName: dr.owner_practice?.name ?? "Ihre Praxis",
      practiceSignature: dr.owner_practice?.message_signature ?? null,
      practiceId: dr.owner_practice_id ?? null,
    });
  } catch (mailErr) {
    console.error("[digital-request/complete] Mailversand fehlgeschlagen", mailErr);
    await prisma.digitalRequest.updateMany({
      where: {
        id: dr.id,
        status: { in: OPEN_STATUSES },
        completion_message: null,
        completed_at: null,
        completion_claimed_at: claimedAt,
      },
      data: { completion_claimed_at: null },
    });
    return NextResponse.json(
      { ok: false, error: "Mailversand fehlgeschlagen." },
      { status: 500 },
    );
  }

  const completedAt = new Date();
  const completed = await prisma.digitalRequest.updateMany({
    where: {
      id: dr.id,
      status: { in: OPEN_STATUSES },
      completion_message: null,
      completed_at: null,
      completion_claimed_at: claimedAt,
    },
    data: {
      status: "closed",
      completion_message: completionMessage,
      completed_at: completedAt,
      completion_claimed_at: null,
    },
  });

  if (completed.count !== 1) {
    await prisma.digitalRequest.updateMany({
      where: {
        id: dr.id,
        status: { in: OPEN_STATUSES },
        completion_message: null,
        completed_at: null,
        completion_claimed_at: claimedAt,
      },
      data: { completion_claimed_at: null },
    });
    return NextResponse.json(
      { ok: false, error: "Die Anfrage konnte nach dem Mailversand nicht abgeschlossen werden." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, status: "closed", completed_at: completedAt });
}
