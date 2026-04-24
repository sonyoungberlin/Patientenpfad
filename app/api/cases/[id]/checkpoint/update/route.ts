import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CheckpointCategory, CheckpointMode, type ActiveCheckpoint, isMultiSelectCheckpoint, isAssessmentCheckpoint } from "@/lib/types";
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
    if (typeof checkpoint.id !== "string") return false;
    if (
      checkpoint.category !== CheckpointCategory.M &&
      checkpoint.category !== CheckpointCategory.O
    ) {
      return false;
    }

    // MULTI_SELECT checkpoints have selections instead of status
    if (checkpoint.mode === CheckpointMode.MULTI_SELECT) {
      return Array.isArray(checkpoint.selections);
    }

    return typeof checkpoint.status === "string";
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

    if (!checkpointId) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    // Determine whether this request carries an `enabled` field (MULTI_SELECT or ASSESSMENT update)
    // or a `status` field (standard update). The exact update type is resolved after `target` is found.
    const hasEnabled = "enabled" in body;

    const status =
      body?.status === "OK" ||
      body?.status === "TO_DO" ||
      body?.status === "ZURÜCKSTELLEN"
        ? (body.status as CheckpointStatus)
        : undefined;

    if (!hasEnabled && !status) {
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

    if (session.doctor_confirmed) {
      return NextResponse.json(
        { ok: false, error: "Fall ist ärztlich bestätigt und eingefroren." },
        { status: 409 },
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

    const target = checkpoints[targetCheckpointIndex];
    const updatedCheckpoints = [...checkpoints];

    // Determine the exact update type now that we have the target checkpoint.
    const isMultiSelectUpdate = hasEnabled && !("status" in body) && isMultiSelectCheckpoint(target);
    const isAssessmentUpdate = hasEnabled && !("status" in body) && isAssessmentCheckpoint(target);

    if (isMultiSelectUpdate) {
      // MULTI_SELECT checkpoint update: validate and apply enabled + selections
      if (!isMultiSelectCheckpoint(target)) {
        return NextResponse.json(
          { ok: false, error: "Checkpoint is not a multi-select type" },
          { status: 400 },
        );
      }
      const enabled = typeof body.enabled === "boolean" ? body.enabled : false;
      const selections = Array.isArray(body.selections)
        ? (body.selections as unknown[]).filter((s): s is string => typeof s === "string")
        : [];
      updatedCheckpoints[targetCheckpointIndex] = {
        ...target,
        enabled,
        selections: enabled ? selections : [],
      } as ActiveCheckpoint;
    } else if (isAssessmentUpdate) {
      // ASSESSMENT checkpoint update: only toggle enabled
      const enabled = typeof body.enabled === "boolean" ? body.enabled : false;
      updatedCheckpoints[targetCheckpointIndex] = {
        ...target,
        enabled,
      } as ActiveCheckpoint;
    } else {
      // Fallback: `enabled` was sent but checkpoint is neither MULTI_SELECT nor ASSESSMENT
      if (hasEnabled && !status) {
        return NextResponse.json(
          { ok: false, error: "Checkpoint is not a multi-select type" },
          { status: 400 },
        );
      }
      // Standard checkpoint update
      if (!isValidStatus(target, status!)) {
        return NextResponse.json(
          { ok: false, error: "Invalid status for checkpoint category" },
          { status: 400 },
        );
      }
      updatedCheckpoints[targetCheckpointIndex] = {
        ...target,
        status,
      } as ActiveCheckpoint;
    }

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
