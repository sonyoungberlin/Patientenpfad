/**
 * POST /api/workflow-cases/internal-protocol/start
 *
 * Erzeugt einen initialen PracticeWorkflowSnapshot mit DB-aktuellen
 * Checkpoint-Daten (DB-first, statischer Katalog als Fallback).
 *
 * Der Snapshot wird NICHT in der DB gespeichert – das geschieht erst
 * beim ersten Speichern über `savePracticeWorkflowDraft`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getCaseProfileFromLib } from "@/lib/practiceProcesses/caseProfileLibrary";
import { getCheckpointFromLib } from "@/lib/practiceProcesses/checkpointLibrary";
import { buildInitialPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeCheckpoint } from "@/lib/practiceProcesses";

export async function POST(req: NextRequest) {
  const account = await getSessionAccount(req);
  if (!account || !account.is_approved) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!canAccessWorkflowCases(account)) {
    return NextResponse.json(
      { ok: false, error: "Arbeitsprozesse nicht freigeschaltet." },
      { status: 403 },
    );
  }

  let body: { caseProfileId?: unknown };
  try {
    body = (await req.json()) as { caseProfileId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  }

  if (typeof body.caseProfileId !== "string" || !body.caseProfileId) {
    return NextResponse.json({ ok: false, error: "caseProfileId fehlt." }, { status: 400 });
  }

  const profile = await getCaseProfileFromLib(body.caseProfileId);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Praxisfall nicht gefunden." }, { status: 404 });
  }

  // Alle Checkpoints des Profils aus DB-Library laden (DB-first, Katalog-Fallback)
  const cpEntries = await Promise.all(
    profile.checkpointRefs.map(async (ref) => {
      const cp = await getCheckpointFromLib(ref.checkpointId);
      return [ref.checkpointId, cp] as [string, PracticeCheckpoint | undefined];
    }),
  );
  const checkpointMap = new Map<string, PracticeCheckpoint>(
    cpEntries.filter((e): e is [string, PracticeCheckpoint] => e[1] !== undefined),
  );

  const snapshot = buildInitialPracticeWorkflowSnapshot(
    profile,
    (id) => checkpointMap.get(id),
  );

  return NextResponse.json({ ok: true, snapshot });
}
