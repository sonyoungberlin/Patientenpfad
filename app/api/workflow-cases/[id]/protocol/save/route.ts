import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import {
  isInternalProtocolWorkflowSnapshot,
  isProtocolWorkflowCheckpoint,
  type ProtocolWorkflowCheckpoint,
} from "@/lib/workflow/internalProtocol/workflowAdapter";

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
  if (!canAccessWorkflowCases(account)) {
    return NextResponse.json({ ok: false, error: "Arbeitsprozesse nicht freigeschaltet." }, { status: 403 });
  }

  const { id } = await params;

  const session = await prisma.workflowSession.findFirst({
    where: { id, ...getWorkflowOwnershipFilter(account) },
    select: { id: true, process_snapshot: true },
  });

  if (!session) {
    return NextResponse.json({ ok: false, error: "Sitzung nicht gefunden." }, { status: 404 });
  }

  if (!isInternalProtocolWorkflowSnapshot(session.process_snapshot)) {
    return NextResponse.json({ ok: false, error: "Keine interne Protokoll-Sitzung." }, { status: 400 });
  }

  let body: { checkpoints?: unknown };
  try {
    body = (await req.json()) as { checkpoints?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (!Array.isArray(body.checkpoints)) {
    return NextResponse.json({ ok: false, error: "checkpoints fehlt oder ist kein Array." }, { status: 400 });
  }

  const incomingCheckpoints = body.checkpoints as unknown[];
  if (!incomingCheckpoints.every(isProtocolWorkflowCheckpoint)) {
    return NextResponse.json({ ok: false, error: "Ungültige Checkpoint-Daten." }, { status: 400 });
  }

  const validCheckpoints = incomingCheckpoints as ProtocolWorkflowCheckpoint[];

  // Nur bekannte Checkpoint-IDs akzeptieren
  const knownIds = new Set(session.process_snapshot.checkpoints.map((c) => c.id));
  const updateMap = new Map<string, ProtocolWorkflowCheckpoint>();
  for (const cp of validCheckpoints) {
    if (knownIds.has(cp.id)) {
      updateMap.set(cp.id, cp);
    }
  }

  const updatedCheckpoints = session.process_snapshot.checkpoints.map((existing) => {
    const update = updateMap.get(existing.id);
    return update !== undefined ? { ...existing, ...update } : existing;
  });

  await prisma.workflowSession.update({
    where: { id },
    data: {
      process_snapshot: {
        ...(session.process_snapshot as Record<string, unknown>),
        checkpoints: updatedCheckpoints,
      } as unknown as Prisma.InputJsonValue,
      internal_saved_at: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
