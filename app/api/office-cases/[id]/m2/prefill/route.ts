import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { canAccessOfficeCases, ownsOfficeCase } from "@/lib/office/scope";
import type { M2AnswerValue, OfficeCheckpointSnapshot } from "@/lib/office/types";

type OfficeCaseSnapshotRecord = {
  topicId?: unknown;
  topicTitle?: unknown;
  checkpoints?: unknown;
};

type CheckpointNoteUpdate = {
  id?: unknown;
  m2_answers?: unknown;
  known_note?: unknown;
  missing_note?: unknown;
  answer_source?: unknown;
  deadline?: unknown;
  responsible_role?: unknown;
  authority?: unknown;
  required_documents?: unknown;
  escalation_needed?: unknown;
};

function readSnapshot(value: unknown): OfficeCaseSnapshotRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as OfficeCaseSnapshotRecord;
}

function isCheckpointArray(value: unknown): value is OfficeCheckpointSnapshot[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    return typeof (item as { id?: unknown }).id === "string";
  });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const M2_ANSWER_VALUES = new Set(["YES", "NO", "UNCLEAR"]);

function isM2Answers(value: unknown): value is Record<string, M2AnswerValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === "string" && M2_ANSWER_VALUES.has(v),
  );
}

function isCheckpointNoteUpdate(value: unknown): value is CheckpointNoteUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const item = value as CheckpointNoteUpdate;
  return (
    isString(item.id) &&
    (item.m2_answers === undefined || isM2Answers(item.m2_answers)) &&
    (item.known_note === undefined || isString(item.known_note)) &&
    (item.missing_note === undefined || isString(item.missing_note)) &&
    (item.answer_source === undefined || isString(item.answer_source)) &&
    (item.deadline === undefined || isString(item.deadline)) &&
    (item.responsible_role === undefined || isString(item.responsible_role)) &&
    (item.authority === undefined || isString(item.authority)) &&
    (item.required_documents === undefined || isStringArray(item.required_documents)) &&
    (item.escalation_needed === undefined || isBoolean(item.escalation_needed))
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await getSessionAccount(req);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!account.is_approved) {
    return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
  }
  if (!canAccessOfficeCases(account)) {
    return NextResponse.json({ ok: false, error: "Officepfad nicht freigeschaltet." }, { status: 403 });
  }

  const { id } = await params;
  let body: { checkpoints?: unknown; checkpoint?: unknown };

  try {
    body = (await req.json()) as { checkpoints?: unknown; checkpoint?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const officeCase = await prisma.officeCaseSession.findUnique({
    where: { id },
    select: {
      id: true,
      owner_account_id: true,
      owner_practice_id: true,
      checkpoint_snapshot: true,
    },
  });

  if (!officeCase || !ownsOfficeCase(account, officeCase)) {
    return NextResponse.json({ ok: false, error: "Nicht gefunden." }, { status: 404 });
  }

  const snapshot = readSnapshot(officeCase.checkpoint_snapshot);
  const topicId = typeof snapshot?.topicId === "string" && isOfficeTopicId(snapshot.topicId)
    ? snapshot.topicId
    : null;
  if (!topicId || !isCheckpointArray(snapshot?.checkpoints)) {
    return NextResponse.json({ ok: false, error: "Ungültiger Snapshot." }, { status: 500 });
  }

  const rawUpdates = Array.isArray(body.checkpoints)
    ? body.checkpoints
    : body.checkpoint !== undefined
      ? [body.checkpoint]
      : [];

  if (rawUpdates.length === 0) {
    return NextResponse.json({ ok: false, error: "Keine Checkpoint-Daten übergeben." }, { status: 400 });
  }

  if (!rawUpdates.every(isCheckpointNoteUpdate)) {
    return NextResponse.json({ ok: false, error: "Ungültige Checkpoint-Daten." }, { status: 400 });
  }

  const updates: CheckpointNoteUpdate[] = rawUpdates;

  const nextCheckpoints = snapshot.checkpoints.map((checkpoint) => {
    const update = updates.find((item) => item.id === checkpoint.id);
    if (!update) return checkpoint;

    return {
      ...checkpoint,
      m2_answers: isM2Answers(update.m2_answers) ? update.m2_answers : checkpoint.m2_answers,
      known_note: isString(update.known_note) ? update.known_note : checkpoint.known_note,
      missing_note: isString(update.missing_note) ? update.missing_note : checkpoint.missing_note,
      answer_source: isString(update.answer_source) ? update.answer_source : checkpoint.answer_source,
      deadline: isString(update.deadline) ? update.deadline : checkpoint.deadline,
      responsible_role: isString(update.responsible_role)
        ? update.responsible_role
        : checkpoint.responsible_role,
      authority: isString(update.authority) ? update.authority : checkpoint.authority,
      required_documents: isStringArray(update.required_documents)
        ? update.required_documents
        : checkpoint.required_documents,
      escalation_needed: isBoolean(update.escalation_needed)
        ? update.escalation_needed
        : checkpoint.escalation_needed,
    };
  });

  const knownCheckpoints = snapshot.checkpoints as OfficeCheckpointSnapshot[];
  const unknownIds = updates
    .map((update) => update.id)
    .filter((value): value is string => typeof value === "string")
    .filter((checkpointId) => !knownCheckpoints.some((checkpoint) => checkpoint.id === checkpointId));

  if (unknownIds.length > 0) {
    return NextResponse.json({ ok: false, error: "Checkpoint nicht gefunden." }, { status: 404 });
  }

  const updatedSnapshot = {
    topicId,
    checkpoints: nextCheckpoints,
  } as Prisma.InputJsonValue;

  await prisma.officeCaseSession.update({
    where: { id },
    data: {
      checkpoint_snapshot: updatedSnapshot,
    },
  });

  return NextResponse.json({
    ok: true,
    office_case: {
      id,
      checkpoint_snapshot: updatedSnapshot,
    },
  });
}
