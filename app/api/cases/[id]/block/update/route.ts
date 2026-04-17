import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BlockStatus, type ActiveCheckpoint, type BlockSummary } from "@/lib/types";
import { deriveBlockStatus } from "@/lib/logic/deriveBlockStatus";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const block_id: string | undefined =
      typeof body?.block_id === "string" ? body.block_id : undefined;

    if (!block_id) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    const session = await prisma.caseSession.findUnique({ where: { id } });

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    const anchor = session.block_status_anchor;
    if (!Array.isArray(anchor)) {
      return NextResponse.json(
        { ok: false, error: "Block not found" },
        { status: 400 }
      );
    }

    const blocks = anchor as BlockSummary[];
    const blockIndex = blocks.findIndex((b) => b.block_id === block_id);

    if (blockIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Block not found" },
        { status: 400 }
      );
    }

    const allCheckpoints = Array.isArray(session.active_checkpoints)
      ? (session.active_checkpoints as ActiveCheckpoint[])
      : [];
    const filteredCheckpoints = allCheckpoints.filter(
      (checkpoint) => checkpoint.block_id === block_id
    );
    const currentStatus = blocks[blockIndex]?.block_status ?? BlockStatus.OFFEN;
    const derivedStatus = deriveBlockStatus(filteredCheckpoints, currentStatus);

    blocks[blockIndex] = {
      ...blocks[blockIndex],
      block_status: derivedStatus,
    };

    await prisma.caseSession.update({
      where: { id },
      data: { block_status_anchor: blocks },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cases/[id]/block/update]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update block" },
      { status: 500 }
    );
  }
}
