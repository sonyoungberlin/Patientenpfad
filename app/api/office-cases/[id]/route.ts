import { NextRequest, NextResponse } from "next/server";
import { getOfficeTopic, isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { getSessionAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownsOfficeCase } from "@/lib/office/scope";

type OfficeCaseSnapshotRecord = {
  topicId?: unknown;
  topicTitle?: unknown;
  checkpoints?: unknown;
};

function readSnapshot(value: unknown): OfficeCaseSnapshotRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as OfficeCaseSnapshotRecord;
}

export async function GET(
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

  const { id } = await params;

  const officeCase = await prisma.officeCaseSession.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      title: true,
      trigger_note: true,
      checkpoint_snapshot: true,
      owner_account_id: true,
      owner_practice_id: true,
    },
  });

  if (!officeCase || !ownsOfficeCase(account, officeCase)) {
    return NextResponse.json({ ok: false, error: "Nicht gefunden." }, { status: 404 });
  }

  const snapshot = readSnapshot(officeCase.checkpoint_snapshot);
  const topicId = typeof snapshot?.topicId === "string" && isOfficeTopicId(snapshot.topicId)
    ? snapshot.topicId
    : null;
  const checkpoints = Array.isArray(snapshot?.checkpoints) ? snapshot?.checkpoints : [];

  return NextResponse.json({
    ok: true,
    office_case: {
      id: officeCase.id,
      createdAt: officeCase.createdAt,
      updatedAt: officeCase.updatedAt,
      title: officeCase.title,
      trigger_note: officeCase.trigger_note,
      topicId,
      topicTitle: topicId ? getOfficeTopic(topicId).title : null,
      checkpoint_snapshot: {
        topicId,
        checkpoints,
      },
      owner_account_id: officeCase.owner_account_id,
      owner_practice_id: officeCase.owner_practice_id,
    },
  });
}

export async function DELETE(
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

  const { id } = await params;

  return NextResponse.json(
    {
      ok: false,
      error: "S1 scaffold only: Delete-Logik noch nicht implementiert.",
      id,
    },
    { status: 501 },
  );
}
