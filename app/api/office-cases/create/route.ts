import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import {
  buildInitialSnapshotForTopic,
  getOfficeTopic,
  isOfficeTopicId,
} from "@/lib/office/checkpointCatalog";
import { getOfficeCreateOwnershipData } from "@/lib/office/scope";

type CreateOfficeCaseBody = {
  topicId?: unknown;
  title?: unknown;
  trigger_note?: unknown;
  checkpoint_snapshot?: unknown;
  checkpoints?: unknown;
  snapshot?: unknown;
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

export async function POST(req: NextRequest) {
  const account = await getSessionAccount(req);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!account.is_approved) {
    return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
  }

  let body: CreateOfficeCaseBody;
  try {
    body = (await req.json()) as CreateOfficeCaseBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (body.checkpoint_snapshot !== undefined || body.checkpoints !== undefined || body.snapshot !== undefined) {
    return NextResponse.json(
      { ok: false, error: "Snapshot wird serverseitig erzeugt." },
      { status: 400 },
    );
  }

  if (!isString(body.topicId) || !isOfficeTopicId(body.topicId)) {
    return NextResponse.json({ ok: false, error: "Ungültige topicId." }, { status: 400 });
  }

  if (body.title !== undefined && !isString(body.title)) {
    return NextResponse.json({ ok: false, error: "Ungültiger Titel." }, { status: 400 });
  }

  if (body.trigger_note !== undefined && !isString(body.trigger_note)) {
    return NextResponse.json({ ok: false, error: "Ungültige trigger_note." }, { status: 400 });
  }

  const ownershipData = getOfficeCreateOwnershipData(account);
  const topic = getOfficeTopic(body.topicId);
  const checkpointSnapshot = {
    topicId: topic.id,
    topicTitle: topic.title,
    checkpoints: buildInitialSnapshotForTopic(topic.id),
  } as Prisma.InputJsonValue;

  const officeCase = await prisma.officeCaseSession.create({
    data: {
      ...ownershipData,
      title: body.title?.trim() || null,
      trigger_note: body.trigger_note?.trim() || null,
      checkpoint_snapshot: checkpointSnapshot,
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      title: true,
      trigger_note: true,
      owner_account_id: true,
      owner_practice_id: true,
      checkpoint_snapshot: true,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      office_case: officeCase,
    },
    { status: 201 },
  );
}
