import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BlockStatus, type BlockSummary } from "@/lib/types";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string | undefined =
      typeof body?.query === "string" ? body.query : undefined;

    const session = await prisma.caseSession.create({
      data: {
        query_raw: query ?? null,
        stage_status: "INTAKE" as const,
        block_status_anchor: DEFAULT_BLOCKS,
        active_checkpoints: [],
        ctx_prefill: [],
        ctx_final: [],
        summary_anchor: [],
      },
    });

    return NextResponse.json({
      ok: true,
      case_id: session.id,
      stage_status: session.stage_status,
    });
  } catch (err) {
    console.error("[cases/create]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create case session" },
      { status: 500 }
    );
  }
}
