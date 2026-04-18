import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CheckpointCategory, type ActiveCheckpoint } from "@/lib/types";
import { getSessionAccount } from "@/lib/auth";

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

function isActiveCheckpointArray(value: unknown): value is ActiveCheckpoint[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const checkpoint = item as Record<string, unknown>;
    return (
      typeof checkpoint.id === "string" &&
      (checkpoint.category === CheckpointCategory.M ||
        checkpoint.category === CheckpointCategory.O) &&
      typeof checkpoint.status === "string"
    );
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
    }
    if (!account.is_approved) {
      return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
    }

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Malformed JSON body" },
        { status: 400 },
      );
    }

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

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    if (!isActiveCheckpointArray(session.active_checkpoints)) {
      return NextResponse.json(
        { ok: false, error: "Invalid checkpoint state" },
        { status: 500 },
      );
    }

    const checkpoints = session.active_checkpoints;
    const targetCheckpointIndex = checkpoints.findIndex(
      (cp) => cp.id === checkpointId,
    );

    if (targetCheckpointIndex === -1) {
      return NextResponse.json(
        { ok: false, error: "Checkpoint not found" },
        { status: 404 },
      );
    }

    if (!isValidStatus(checkpoints[targetCheckpointIndex], status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status for checkpoint category" },
        { status: 400 },
      );
    }

    const updatedCheckpoints = [...checkpoints];
    updatedCheckpoints[targetCheckpointIndex] = {
      ...updatedCheckpoints[targetCheckpointIndex],
      status,
    } as ActiveCheckpoint;

    await prisma.caseSession.update({
      where: { id },
      data: {
        active_checkpoints: updatedCheckpoints,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[cases/[id]/checkpoint/update]", {
        name: err.name,
        message: err.message,
      });
    } else {
      console.error("[cases/[id]/checkpoint/update]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Failed to update checkpoint status" },
      { status: 500 },
    );
  }
}
