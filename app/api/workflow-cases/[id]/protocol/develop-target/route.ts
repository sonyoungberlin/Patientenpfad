import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getWorkflowOwnershipFilter, getWorkflowCreateOwnershipData } from "@/lib/workflow/scope";
import { getProcessKindForTopicId } from "@/lib/workflow/processKind";
import {
  isInternalProtocolWorkflowSnapshot,
  getPracticeProcessMode,
  buildTargetStateSnapshotFromCurrent,
} from "@/lib/workflow/internalProtocol/workflowAdapter";

export async function POST(
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

  const sourceSession = await prisma.workflowSession.findFirst({
    where: { id, ...getWorkflowOwnershipFilter(account) },
    select: { id: true, process_snapshot: true },
  });

  if (!sourceSession) {
    return NextResponse.json({ ok: false, error: "Sitzung nicht gefunden." }, { status: 404 });
  }

  // Explizite Prozessart-Prüfung über den zentralen Katalog (processKind.ts)
  const snap = sourceSession.process_snapshot as Record<string, unknown> | null;
  const topicId = snap && typeof snap.topicId === "string" ? snap.topicId : null;
  const processKind = topicId !== null ? getProcessKindForTopicId(topicId) : undefined;

  if (processKind === undefined) {
    return NextResponse.json(
      { ok: false, error: "Unbekannte Prozess-ID – kein Eintrag im Prozesskatalog." },
      { status: 400 },
    );
  }
  if (processKind !== "PRACTICE_PROCESS") {
    return NextResponse.json(
      { ok: false, error: "Diese Funktion ist nur für Praxisabläufe (PRACTICE_PROCESS) verfügbar, nicht für klinische Standardprozesse." },
      { status: 400 },
    );
  }
  if (topicId !== "patienten-ohne-termin") {
    return NextResponse.json(
      { ok: false, error: "Nur für den Praxisablauf 'Patienten ohne Termin' unterstützt." },
      { status: 400 },
    );
  }

  if (!isInternalProtocolWorkflowSnapshot(sourceSession.process_snapshot)) {
    return NextResponse.json({ ok: false, error: "Ungültige Snapshot-Struktur." }, { status: 400 });
  }

  if (getPracticeProcessMode(sourceSession.process_snapshot) !== "CURRENT_STATE") {
    return NextResponse.json(
      { ok: false, error: "Nur aus einer Bestandsaufnahme (CURRENT_STATE) kann ein Soll-Zustand entwickelt werden." },
      { status: 400 },
    );
  }

  const newSnapshot = buildTargetStateSnapshotFromCurrent(
    sourceSession.process_snapshot,
    sourceSession.id,
  );

  const ownership = getWorkflowCreateOwnershipData(account);
  const newSession = await prisma.workflowSession.create({
    data: {
      process_snapshot: newSnapshot as unknown as Prisma.InputJsonValue,
      internal_saved_at: new Date(),
      ...ownership,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: newSession.id });
}
