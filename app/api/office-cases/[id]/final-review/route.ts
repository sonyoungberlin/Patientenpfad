import { Prisma, PracticeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ownsOfficeCase } from "@/lib/office/scope";
import { getOfficeTopicVersion, OFFICE_TOPIC_HIRING_REPLACEMENT } from "@/lib/office/checkpointCatalog";
import { requireOfficeCasesManagementAccess } from "@/lib/authz";
import { containsSensitivePersonalIdentifier } from "@/lib/office/privacy";

type SnapshotRecord = {
  topicId?: unknown;
  templateVersion?: unknown;
  decisionRevision?: unknown;
  checkpoints?: unknown;
  final_review?: unknown;
  final_review_history?: unknown;
  [key: string]: unknown;
};

function readSnapshot(value: unknown): SnapshotRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as SnapshotRecord;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireOfficeCasesManagementAccess(req);
  if (error) return error;

  let body: { decision?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (
    (body.decision !== "APPROVED" && body.decision !== "NOT_APPROVED") ||
    (body.note !== undefined && typeof body.note !== "string")
  ) {
    return NextResponse.json({ ok: false, error: "Ungültige Freigabeentscheidung." }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > 1000) {
    return NextResponse.json({ ok: false, error: "Die Notiz darf höchstens 1.000 Zeichen enthalten." }, { status: 400 });
  }
  if (containsSensitivePersonalIdentifier(note)) {
    return NextResponse.json(
      { ok: false, error: "Bitte keine Steuer-ID, Sozialversicherungsnummer oder Bankverbindung in der Freigabenotiz speichern." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const officeCase = await prisma.officeCaseSession.findUnique({
    where: { id },
    select: {
      id: true,
      owner_account_id: true,
      owner_practice_id: true,
      checkpoint_snapshot: true,
      internal_saved_at: true,
    },
  });
  if (!officeCase || !ownsOfficeCase(account, officeCase)) {
    return NextResponse.json({ ok: false, error: "Nicht gefunden." }, { status: 404 });
  }

  const snapshot = readSnapshot(officeCase.checkpoint_snapshot);
  if (
    snapshot?.topicId !== OFFICE_TOPIC_HIRING_REPLACEMENT ||
    getOfficeTopicVersion(OFFICE_TOPIC_HIRING_REPLACEMENT, snapshot.templateVersion) !== 2 ||
    !Array.isArray(snapshot.checkpoints)
  ) {
    return NextResponse.json({ ok: false, error: "Für diesen Officefall ist keine Abschlussfreigabe verfügbar." }, { status: 400 });
  }
  const hasOpenPoints = snapshot.checkpoints.some(
    (checkpoint) =>
      Boolean(checkpoint) &&
      typeof checkpoint === "object" &&
      !Array.isArray(checkpoint) &&
      ["OPEN", "NO"].includes(String((checkpoint as { state?: unknown }).state)),
  );
  if (body.decision === "APPROVED" && hasOpenPoints && !note) {
    return NextResponse.json(
      { ok: false, error: "Bitte dokumentieren Sie die Bewertung der noch offenen Punkte vor der Freigabe." },
      { status: 400 },
    );
  }

  const role = account.memberships.find(
    (membership) => membership.practice_id === account.current_practice?.id,
  )?.role;
  if (role !== PracticeRole.OWNER && role !== PracticeRole.ADMIN) {
    return NextResponse.json({ ok: false, error: "Rolle nicht ausreichend." }, { status: 403 });
  }

  const reviewedAt = new Date().toISOString();
  const reviewRecord = {
    decision: body.decision,
    note,
    reviewer_account_id: account.id,
    reviewer_email: account.email,
    reviewer_role: role,
    reviewed_at: reviewedAt,
    reviewed_revision: typeof snapshot.decisionRevision === "number" ? snapshot.decisionRevision : 0,
  };
  const history = Array.isArray(snapshot.final_review_history)
    ? snapshot.final_review_history.filter(
        (item) => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
  const previousReview = snapshot.final_review;
  const previousAlreadyInHistory =
    Boolean(previousReview) &&
    typeof previousReview === "object" &&
    !Array.isArray(previousReview) &&
    history.some(
      (item) =>
        (item as { reviewed_at?: unknown }).reviewed_at ===
          (previousReview as { reviewed_at?: unknown }).reviewed_at &&
        (item as { decision?: unknown }).decision ===
          (previousReview as { decision?: unknown }).decision,
    );
  const updatedSnapshot = {
    ...snapshot,
    final_review: reviewRecord,
    final_review_history: [
      ...history,
      ...(previousReview && !previousAlreadyInHistory ? [previousReview] : []),
      reviewRecord,
    ],
  } as Prisma.InputJsonValue;

  await prisma.officeCaseSession.update({
    where: { id },
    data: {
      checkpoint_snapshot: updatedSnapshot,
      internal_saved_at: officeCase.internal_saved_at ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true, checkpoint_snapshot: updatedSnapshot });
}
