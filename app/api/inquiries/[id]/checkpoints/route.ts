import { NextRequest, NextResponse } from "next/server";
import { requireInquiriesAccess } from "@/lib/authz";
import {
  getInquirySessionWithOutput,
  updateInquiryCheckpointStatuses,
  isStringRecord,
  InquirySessionError,
} from "@/lib/inquiries/inquirySessionService";

/**
 * PATCH /api/inquiries/[id]/checkpoints
 *
 * Ersetzt den vollständigen Checkpoint- und Aktions-Status-Blob einer Session.
 * Kein partielles Merge – der übergebene Stand wird vollständig gespeichert.
 *
 * Body: {
 *   checkpointStatuses: Record<string, string>
 *   actionStatuses?: Record<string, string>
 * }
 * Response 200: { ok: true }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireInquiriesAccess(req);
    if (error) return error;

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Ungültiger JSON-Body." },
        { status: 400 },
      );
    }

    if (
      !body?.checkpointStatuses ||
      typeof body.checkpointStatuses !== "object" ||
      Array.isArray(body.checkpointStatuses)
    ) {
      return NextResponse.json(
        { ok: false, error: "checkpointStatuses fehlt oder ist kein Objekt." },
        { status: 400 },
      );
    }

    // Ownership prüfen: Session muss dem anfragenden Account gehören.
    const existing = await getInquirySessionWithOutput(id, account.id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Session nicht gefunden." },
        { status: 404 },
      );
    }

    const checkpointStatuses = body.checkpointStatuses as Record<string, string>;
    const actionStatuses = isStringRecord(body?.actionStatuses)
      ? body.actionStatuses
      : undefined;

    const explanationOutputStatuses = isStringRecord(body?.explanationOutputStatuses)
      ? body.explanationOutputStatuses
      : undefined;

    const communicationReasonSelection = isStringRecord(body?.communicationReasonSelection)
      ? body.communicationReasonSelection
      : undefined;

    const responseGoalSelection = isStringRecord(body?.responseGoalSelection)
      ? body.responseGoalSelection
      : undefined;

    await updateInquiryCheckpointStatuses({
      sessionId: id,
      checkpointStatuses,
      actionStatuses,
      explanationOutputStatuses,
      communicationReasonSelection,
      responseGoalSelection,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InquirySessionError) {
      if (err.code === "session_not_found") {
        return NextResponse.json(
          { ok: false, error: err.message },
          { status: 404 },
        );
      }
      if (err.code === "session_confirmed") {
        return NextResponse.json(
          { ok: false, error: err.message },
          { status: 409 },
        );
      }
    }
    if (err instanceof Error) {
      console.error("[inquiries/[id]/checkpoints]", { name: err.name, message: err.message });
    } else {
      console.error("[inquiries/[id]/checkpoints]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Checkpoint-Statuses konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
