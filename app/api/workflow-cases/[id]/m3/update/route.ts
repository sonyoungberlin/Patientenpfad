import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isProcessPointStatus, isValidProcessSnapshot } from "@/lib/workflow/types";

type M3CheckpointUpdate = {
  id?: unknown;
  status?: unknown;
};

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
    select: { id: true, process_snapshot: true, internal_saved_at: true },
  });

  if (!session) {
    return NextResponse.json({ ok: false, error: "Sitzung nicht gefunden." }, { status: 404 });
  }

  if (!isValidProcessSnapshot(session.process_snapshot)) {
    return NextResponse.json({ ok: false, error: "Ungültiger Snapshot." }, { status: 500 });
  }

  let body: { m3Checkpoints?: unknown };
  try {
    body = (await req.json()) as { m3Checkpoints?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (!Array.isArray(body.m3Checkpoints)) {
    return NextResponse.json({ ok: false, error: "m3Checkpoints fehlt oder ist kein Array." }, { status: 400 });
  }

  const snapshot = { ...session.process_snapshot };

  // Nur Einträge mit gültiger id (string) und gültigem Status weiterverarbeiten.
  const validUpdates = (body.m3Checkpoints as M3CheckpointUpdate[]).filter(
    (item) => typeof item.id === "string" && isProcessPointStatus(item.status),
  );

  if (validUpdates.length === 0) {
    return NextResponse.json({ ok: false, error: "Keine gültigen M3-Checkpoints übergeben." }, { status: 400 });
  }

  // Statusänderungen auf bekannte Checkpoint-IDs beschränken, damit unbekannte
  // IDs keine neuen Einträge einschleusen können.
  const existingCheckpoints = snapshot.m3Checkpoints ?? [];
  const updateMap = new Map<string, import("@/lib/workflow/types").ProcessPointStatus>();
  for (const item of validUpdates) {
    const knownId = item.id as string;
    if (existingCheckpoints.some((c) => c.id === knownId)) {
      updateMap.set(knownId, item.status as import("@/lib/workflow/types").ProcessPointStatus);
    }
  }

  // Vorhandene Checkpoints vollständig erhalten; nur den Status überschreiben,
  // wo ein gültiges Update vorliegt. Alle anderen Felder (m2_answers, title …)
  // bleiben durch den Spread unverändert.
  snapshot.m3Checkpoints = existingCheckpoints.map((existing) => {
    const newStatus = updateMap.get(existing.id);
    return newStatus !== undefined ? { ...existing, status: newStatus } : existing;
  });

  await prisma.workflowSession.update({
    where: { id },
    data: {
      process_snapshot: snapshot,
      internal_saved_at: session.internal_saved_at ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
