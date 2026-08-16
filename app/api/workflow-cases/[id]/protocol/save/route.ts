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
import { isPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

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

  let body: { checkpoints?: unknown; snapshot?: unknown; title?: unknown };
  try {
    body = (await req.json()) as { checkpoints?: unknown; snapshot?: unknown; title?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  // --- Pfad P: Neuer PracticeWorkflow – voller Snapshot-Überschrieb ---
  if (isPracticeWorkflowSnapshot(body.snapshot)) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ ok: false, error: "Titel fehlt." }, { status: 400 });
    }
    await prisma.workflowSession.update({
      where: { id },
      data: {
        title: body.title.trim(),
        process_snapshot: body.snapshot as unknown as Prisma.InputJsonValue,
        internal_saved_at: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  // --- Pfad I: Bestehender InternalProtocol ---
  if (!isInternalProtocolWorkflowSnapshot(session.process_snapshot)) {
    return NextResponse.json({ ok: false, error: "Keine interne Protokoll-Sitzung." }, { status: 400 });
  }

  // Pfad I-A: Voller Snapshot-Überschrieb (aus Draft-Save-Flow)
  if (body.snapshot !== undefined) {
    if (!isInternalProtocolWorkflowSnapshot(body.snapshot)) {
      return NextResponse.json({ ok: false, error: "Ungültiger Snapshot." }, { status: 400 });
    }
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ ok: false, error: "Titel fehlt." }, { status: 400 });
    }
    await prisma.workflowSession.update({
      where: { id },
      data: {
        title: body.title.trim(),
        process_snapshot: body.snapshot as unknown as Prisma.InputJsonValue,
        internal_saved_at: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Pfad I-B: Checkpoint-Merge (bestehende Nutzung durch die alten Editoren)
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

  // inheritedQuestionIds: Frage-IDs entfernen, deren Antwort sich geändert hat
  const currentIds = session.process_snapshot.inheritedQuestionIds;
  let updatedInheritedQuestionIds: string[] | undefined = currentIds
    ? [...currentIds]
    : undefined;
  if (updatedInheritedQuestionIds && updatedInheritedQuestionIds.length > 0) {
    for (const incomingCp of validCheckpoints) {
      const oldCp = session.process_snapshot.checkpoints.find((c) => c.id === incomingCp.id);
      if (!oldCp) continue;
      for (const [qId, newAnswer] of Object.entries(incomingCp.answers)) {
        const oldAnswer = oldCp.answers[qId];
        if (JSON.stringify(oldAnswer) !== JSON.stringify(newAnswer)) {
          updatedInheritedQuestionIds = updatedInheritedQuestionIds.filter((iId) => iId !== qId);
        }
      }
    }
  }

  await prisma.workflowSession.update({
    where: { id },
    data: {
      process_snapshot: {
        ...(session.process_snapshot as Record<string, unknown>),
        checkpoints: updatedCheckpoints,
        ...(updatedInheritedQuestionIds !== undefined
          ? { inheritedQuestionIds: updatedInheritedQuestionIds }
          : {}),
      } as unknown as Prisma.InputJsonValue,
      internal_saved_at: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
