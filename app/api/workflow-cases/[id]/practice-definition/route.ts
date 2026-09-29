import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import {
  isPracticeWorkflowSnapshot,
  type PracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeCheckpointDefinitionVersionSnapshot } from "@/lib/practiceProcesses/practiceDefinition";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await getSessionAccount(req);
  if (!account || !account.is_approved) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canAccessWorkflowCases(account)) {
    return NextResponse.json({ ok: false, error: "Arbeitsprozesse nicht freigeschaltet." }, { status: 403 });
  }
  const scope = getCatalogOwnershipFilter(account);
  if (!scope) return NextResponse.json({ ok: false, error: "Kein Praxiskontext." }, { status: 403 });

  let body: { checkpointId?: unknown; versionId?: unknown };
  try {
    body = (await req.json()) as { checkpointId?: unknown; versionId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }
  if (typeof body.checkpointId !== "string" || typeof body.versionId !== "string") {
    return NextResponse.json({ ok: false, error: "Checkpoint und Definitionsversion fehlen." }, { status: 400 });
  }

  const { id } = await params;
  const session = await prisma.workflowSession.findFirst({
    where: { id, ...getWorkflowOwnershipFilter(account) },
    select: { id: true, process_snapshot: true },
  });
  if (!session) return NextResponse.json({ ok: false, error: "Entwurf nicht gefunden." }, { status: 404 });
  if (!isPracticeWorkflowSnapshot(session.process_snapshot)) {
    return NextResponse.json({ ok: false, error: "Kein Praxisfall-Entwurf." }, { status: 400 });
  }
  const snapshot = session.process_snapshot as unknown as PracticeWorkflowSnapshot;
  if (snapshot.completedAt) {
    return NextResponse.json({ ok: false, error: "Veröffentlichte Fälle können nicht geändert werden." }, { status: 409 });
  }
  const checkpoint = snapshot.checkpoints.find((item) => item.checkpointId === body.checkpointId);
  if (!checkpoint) {
    return NextResponse.json({ ok: false, error: "Checkpoint gehört nicht zu diesem Entwurf." }, { status: 404 });
  }

  const version = await prisma.practiceCheckpointDefinitionVersion.findUnique({
    where: { id: body.versionId },
  });
  if (!version) return NextResponse.json({ ok: false, error: "Definitionsversion nicht gefunden." }, { status: 404 });
  if (version.checkpoint_id !== body.checkpointId) {
    return NextResponse.json({ ok: false, error: "Definitionsversion gehört zu einem anderen Checkpoint." }, { status: 422 });
  }
  const definition = await prisma.practiceCheckpointDefinition.findUnique({
    where: { id: version.definition_id },
    select: { practice_id: true },
  });
  if (!definition || definition.practice_id !== scope.practice_id) {
    return NextResponse.json({ ok: false, error: "Definitionsversion gehört nicht zu dieser Praxis." }, { status: 403 });
  }

  const pinnedVersion: PracticeCheckpointDefinitionVersionSnapshot = {
    definitionId: version.definition_id,
    versionId: version.id,
    version: version.version,
    checkpointId: version.checkpoint_id,
    template: version.template_snapshot as unknown as PracticeCheckpointDefinitionVersionSnapshot["template"],
    content: version.content as unknown as PracticeCheckpointDefinitionVersionSnapshot["content"],
    releasedAt: version.released_at.toISOString(),
  };
  const updatedSnapshot: PracticeWorkflowSnapshot = {
    ...snapshot,
    checkpoints: snapshot.checkpoints.map((item) =>
      item.checkpointId === body.checkpointId
        ? { ...item, practiceDefinitionVersion: pinnedVersion }
        : item,
    ),
  };

  await prisma.workflowSession.update({
    where: { id: session.id },
    data: { process_snapshot: updatedSnapshot as unknown as Prisma.InputJsonValue, internal_saved_at: new Date() },
  });
  return NextResponse.json({ ok: true, version: pinnedVersion });
}