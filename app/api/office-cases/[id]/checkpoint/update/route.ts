import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { canAccessOfficeCases, ownsOfficeCase } from "@/lib/office/scope";
import {
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";

type OfficeCaseSnapshotRecord = {
  topicId?: unknown;
  topicTitle?: unknown;
  checkpoints?: unknown;
};

type CheckpointUpdateBody = {
  checkpoint_id?: unknown;
  state?: unknown;
  known_note?: unknown;
  missing_note?: unknown;
  answer_source?: unknown;
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

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
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
  let body: CheckpointUpdateBody;

  try {
    body = (await req.json()) as CheckpointUpdateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (!isString(body.checkpoint_id) || !isString(body.state)) {
    return NextResponse.json({ ok: false, error: "Ungültige Eingabe." }, { status: 400 });
  }

  if (
    !isOptionalString(body.known_note) ||
    !isOptionalString(body.missing_note) ||
    !isOptionalString(body.answer_source)
  ) {
    return NextResponse.json({ ok: false, error: "Ungültige Eingabe." }, { status: 400 });
  }

  const state = body.state;
  if (
    state !== OfficeCheckpointState.YES &&
    state !== OfficeCheckpointState.NO &&
    state !== OfficeCheckpointState.OPEN
  ) {
    return NextResponse.json({ ok: false, error: "Ungültiger Checkpoint-State." }, { status: 400 });
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

  const targetIndex = snapshot.checkpoints.findIndex((checkpoint) => checkpoint.id === body.checkpoint_id);
  if (targetIndex === -1) {
    return NextResponse.json({ ok: false, error: "Checkpoint nicht gefunden." }, { status: 404 });
  }

  const target = snapshot.checkpoints[targetIndex];
  const nextKnownNote = isString(body.known_note) ? body.known_note : target.known_note;
  const nextMissingNote = isString(body.missing_note) ? body.missing_note : target.missing_note;
  const nextAnswerSource = isString(body.answer_source) ? body.answer_source : target.answer_source;

  if (state === OfficeCheckpointState.OPEN) {
    if (!nextMissingNote || !nextMissingNote.trim() || !nextAnswerSource || !nextAnswerSource.trim()) {
      return NextResponse.json(
        { ok: false, error: "Für OPEN sind missing_note und answer_source erforderlich." },
        { status: 400 },
      );
    }
  }

  const nextCheckpoints = snapshot.checkpoints.map((checkpoint, index) => {
    if (index !== targetIndex) return checkpoint;
    return {
      ...checkpoint,
      state: state as OfficeCheckpointState,
      known_note: nextKnownNote,
      missing_note: nextMissingNote,
      answer_source: nextAnswerSource,
    };
  });

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
