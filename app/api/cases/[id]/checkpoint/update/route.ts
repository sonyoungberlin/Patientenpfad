import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CheckpointCategory, type ActiveCheckpoint } from "@/lib/types";

type CheckpointStatus = "OK" | "TO_DO" | "ZURÜCKSTELLEN";

function isValidStatus(
  checkpoint: ActiveCheckpoint,
  status: CheckpointStatus,
): boolean {
  if (checkpoint.category === CheckpointCategory.M) {
    return status === "OK" || status === "TO_DO" || status === "ZURÜCKSTELLEN";
  }

  return status === "OK" || status === "TO_DO";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const checkpointId =
      typeof body?.checkpoint_id === "string" ? body.checkpoint_id : undefined;
    const status =
      body?.status === "OK" ||
      body?.status === "TO_DO" ||
      body?.status === "ZURÜCKSTELLEN"
        ? (body.status as CheckpointStatus)
        : undefined;

    if (!checkpointId || !status) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const session = await prisma.caseSession.findUnique({ where: { id } });

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    if (!Array.isArray(session.active_checkpoints)) {
      return NextResponse.json(
        { ok: false, error: "Checkpoint not found" },
        { status: 400 },
      );
    }

    const checkpoints = session.active_checkpoints as ActiveCheckpoint[];
    const checkpointIndex = checkpoints.findIndex((cp) => cp.id === checkpointId);

    if (checkpointIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Checkpoint not found" },
        { status: 404 },
      );
    }

    if (!isValidStatus(checkpoints[checkpointIndex], status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status for checkpoint category" },
        { status: 400 },
      );
    }

    const updatedCheckpoints = checkpoints.map((checkpoint) =>
      checkpoint.id === checkpointId ? { ...checkpoint, status } : checkpoint,
    );

    await prisma.caseSession.update({
      where: { id },
      data: {
        active_checkpoints: updatedCheckpoints,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cases/[id]/checkpoint/update]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update checkpoint status" },
      { status: 500 },
    );
  }
}

