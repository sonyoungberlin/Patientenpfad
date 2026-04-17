import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BlockStatus, type BlockSummary } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const block_id: string | undefined =
      typeof body?.block_id === "string" ? body.block_id : undefined;
    const block_status: string | undefined =
      typeof body?.block_status === "string" ? body.block_status : undefined;

    if (
      !block_id ||
      !block_status ||
      !Object.values(BlockStatus).includes(block_status as BlockStatus)
    ) {
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

    blocks[blockIndex] = {
      ...blocks[blockIndex],
      block_status: block_status as BlockStatus,
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
