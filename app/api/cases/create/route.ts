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
import { deriveActiveCheckpointIdsFromM1 } from "@/lib/logic/m1Activation";

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

    // M1-Auswahl: wenn übergeben, Checkpoints aus Aktivierungsblöcken ableiten.
    // Noch keine vollständigen ActiveCheckpoint-Objekte – nur IDs werden erfasst.
    // Die vollständige Checkpoint-Hydration erfolgt in einem späteren Schritt.
    const m1Selection: M1Selection | undefined =
      body?.m1Selection ?? undefined;
    const m1ActiveIds: string[] = m1Selection
      ? deriveActiveCheckpointIdsFromM1(m1Selection)
      : [];

    // Checkpoints: M1-Logik hat Vorrang. Nur wenn keine M1-Auswahl vorliegt,
    // wird der Legacy-Fallback genutzt (bis UI M1 immer mitliefert).
    const activeCheckpoints: ActiveCheckpoint[] =
      m1ActiveIds.length > 0 ? [] : LEGACY_DEFAULT_CHECKPOINTS;

    const session = await prisma.caseSession.create({
      data: {
        query_raw: query ?? null,
        stage_status: "INTAKE" as const,
        block_status_anchor: DEFAULT_BLOCKS,
        active_checkpoints: activeCheckpoints,
        ctx_prefill: [],
        ctx_final: [],
        summary_anchor: [],
      },
    });

    return NextResponse.json({
      ok: true,
      case_id: session.id,
      stage_status: session.stage_status,
      // Expose activated checkpoint IDs so callers can see what M1 resolved.
      m1_active_checkpoint_ids: m1ActiveIds,
    });
  } catch (err) {
    console.error("[cases/create]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create case session" },
      { status: 500 }
    );
  }
}
