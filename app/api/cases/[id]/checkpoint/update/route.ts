import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CheckpointCategory, CheckpointMode, type ActiveCheckpoint, isMultiSelectCheckpoint, isAssessmentCheckpoint, isStandardCheckpoint } from "@/lib/types";
import { requireCasesAccess } from "@/lib/authz";
import { canAccessCaseSession } from "@/lib/cases/practiceScope";
import {
  isPrefillChangedClinicalStatus,
  parsePrefillChangedClinicalStatus,
  withReviewedPrefillCheckpoints,
} from "@/lib/server/prefillRuns";

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
    const { account, error } = await requireCasesAccess(req);
    if (error) return error;

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
    const expectedClinicalStatus =
      typeof body.expected_clinical_status === "string"
        ? body.expected_clinical_status
        : undefined;

    if (!hasEnabled && !status) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => {
          const session = await tx.caseSession.findUnique({ where: { id } });

          if (!session || !canAccessCaseSession(account, session)) {
            return NextResponse.json(
              { ok: false, error: "Not found" },
              { status: 404 },
            );
          }

          if (session.doctor_confirmed || session.clinical_status === "confirmed") {
            return NextResponse.json(
              { ok: false, error: "Fall ist ärztlich bestätigt und eingefroren." },
              { status: 409 },
            );
          }

          const currentClinicalStatus =
            typeof session.clinical_status === "string" ? session.clinical_status : "none";
          if (
            !hasEnabled &&
            (expectedClinicalStatus !== undefined ||
              isPrefillChangedClinicalStatus(session.clinical_status)) &&
            (expectedClinicalStatus ?? "none") !== currentClinicalStatus
          ) {
            return NextResponse.json(
              {
                ok: false,
                error: "Prefill wurde geändert; M3 muss neu geladen werden.",
                clinical_status: currentClinicalStatus,
                prefill_reset: isPrefillChangedClinicalStatus(currentClinicalStatus),
              },
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
          const reviewableCheckpointIds = checkpoints
            .filter((checkpoint) => {
              if (!isStandardCheckpoint(checkpoint)) return false;
              if (isMultiSelectCheckpoint(checkpoint)) return false;
              return !isAssessmentCheckpoint(checkpoint) || checkpoint.enabled === true;
            })
            .map((checkpoint) => checkpoint.id);
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

          const isMultiSelectUpdate = hasEnabled && !("status" in body) && isMultiSelectCheckpoint(target);
          const isAssessmentUpdate = hasEnabled && !("status" in body) && isAssessmentCheckpoint(target);

          if (isMultiSelectUpdate) {
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
            const enabled = typeof body.enabled === "boolean" ? body.enabled : false;
            updatedCheckpoints[targetCheckpointIndex] = {
              ...target,
              enabled,
            } as ActiveCheckpoint;
          } else {
            if (hasEnabled && !status) {
              return NextResponse.json(
                { ok: false, error: "Checkpoint is not a multi-select type" },
                { status: 400 },
              );
            }
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

          let nextClinicalStatus: string | undefined;
          let reviewComplete = false;
          const reviewMarker = !hasEnabled
            ? parsePrefillChangedClinicalStatus(session.clinical_status)
            : null;
          if (reviewMarker && reviewableCheckpointIds.includes(checkpointId)) {
            const reviewedIds = new Set(reviewMarker.reviewedCheckpointIds);
            reviewedIds.add(checkpointId);
            reviewComplete =
              reviewableCheckpointIds.length > 0 &&
              reviewableCheckpointIds.every((activeId) => reviewedIds.has(activeId));
            nextClinicalStatus = reviewComplete
              ? reviewMarker.wasPrepared
                ? "prepared"
                : "none"
              : withReviewedPrefillCheckpoints(reviewMarker, reviewedIds);
          }

          await tx.caseSession.update({
            where: { id },
            data: {
              active_checkpoints: updatedCheckpoints,
              ...(nextClinicalStatus !== undefined
                ? { clinical_status: nextClinicalStatus }
                : {}),
            },
          });

          return NextResponse.json({
            ok: true,
            clinical_status: nextClinicalStatus ?? currentClinicalStatus,
            review_complete: reviewComplete,
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (err) {
        const code = (err as { code?: unknown } | null)?.code;
        if (code === "P2034" && attempt < 2) continue;
        throw err;
      }
    }
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
