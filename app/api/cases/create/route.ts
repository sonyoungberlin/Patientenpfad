import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BlockStatus,
  CheckpointCategory,
  CheckpointRelevance,
  CheckpointType,
  type ActiveCheckpoint,
  type BlockSummary,
  type M1Selection,
} from "@/lib/types";
import { buildM1SnapshotInitial, isGatekeeperCase } from "@/lib/logic/m1Activation";
import { hydrateActiveCheckpointsFromSnapshot } from "@/lib/logic/checkpointCatalog";

const DEFAULT_BLOCKS: BlockSummary[] = [
  {
    block_id: "communication",
    block_title: "Kommunikation / Erreichbarkeit",
    block_status: BlockStatus.OFFEN,
    active_checkpoint_count: 0,
  },
  {
    block_id: "diagnosis_status",
    block_title: "Diagnosenlage",
    block_status: BlockStatus.OFFEN,
    active_checkpoint_count: 0,
  },
  {
    block_id: "medication_status",
    block_title: "Medikation",
    block_status: BlockStatus.OFFEN,
    active_checkpoint_count: 0,
  },
  {
    block_id: "external_specialists",
    block_title: "Externe Mitbehandler",
    block_status: BlockStatus.OFFEN,
    active_checkpoint_count: 0,
  },
  {
    block_id: "hospital_aftercare",
    block_title: "Krankenhaus-Nachsorge",
    block_status: BlockStatus.OFFEN,
    active_checkpoint_count: 0,
  },
];

/**
 * Fallback-Checkpoint, der nur greift wenn KEINE M1-Auswahl übergeben wird.
 * TODO: Entfernen, sobald die UI die M1-Auswahl immer mitliefert.
 */
const LEGACY_DEFAULT_CHECKPOINTS: ActiveCheckpoint[] = [
  {
    id: "dokumentenlage_arztbrief_vorhanden",
    block_id: "dokumentenlage",
    type: CheckpointType.PRESENCE_CHECK,
    category: CheckpointCategory.O,
    relevance: CheckpointRelevance.P,
    title: "Arztbrief vorhanden",
    description:
      "Prüfen, ob ein aktueller Arztbrief oder vergleichbares Dokument vorliegt.",
    status: "TO_DO",
    m4: {
      type: "ACTION",
      text: "Bitte bringen Sie die für Ihre Behandlung relevanten Befunde zum nächsten Termin mit.",
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string | undefined =
      typeof body?.query === "string" ? body.query : undefined;

    const m1Selection: M1Selection | undefined =
      body?.m1Selection ?? undefined;

    let activeCheckpoints: ActiveCheckpoint[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let m1SnapshotInitial: any = null;

    if (m1Selection) {
      // Gatekeeper-Fall: alle Blöcke klar → kein Strukturfall, keine CaseSession.
      if (isGatekeeperCase(m1Selection)) {
        return NextResponse.json({ ok: true, gatekeeper: true });
      }

      // M1-Pfad: Snapshot einfrieren → Checkpoints daraus hydratisieren.
      // Der Snapshot ist die einzige erlaubte Quelle für active_checkpoints.
      const snapshot = buildM1SnapshotInitial(m1Selection);
      m1SnapshotInitial = snapshot;
      activeCheckpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    } else {
      // Übergangsmodus: kein m1Selection übergeben → Legacy-Fallback.
      // TODO: Entfernen, sobald die UI die M1-Auswahl immer mitliefert.
      activeCheckpoints = LEGACY_DEFAULT_CHECKPOINTS;
    }

    const session = await prisma.caseSession.create({
      data: {
        query_raw: query ?? null,
        stage_status: "INTAKE" as const,
        block_status_anchor: DEFAULT_BLOCKS,
        active_checkpoints: activeCheckpoints,
        ctx_prefill: [],
        ctx_final: [],
        summary_anchor: [],
        m1_snapshot_initial: m1SnapshotInitial ?? undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      case_id: session.id,
      stage_status: session.stage_status,
      m1_snapshot_initial: m1SnapshotInitial,
    });
  } catch (err) {
    console.error("[cases/create]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create case session" },
      { status: 500 }
    );
  }
}
