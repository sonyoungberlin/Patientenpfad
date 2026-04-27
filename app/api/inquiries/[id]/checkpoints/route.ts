import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import {
  getInquirySessionWithOutput,
  updateInquiryCheckpointStatuses,
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
    const account = await getSessionAccount(req);

    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
        { status: 401 },
      );
    }
    if (!account.is_approved) {
      return NextResponse.json(
        { ok: false, error: "Account nicht freigeschaltet." },
        { status: 403 },
      );
    }
    if (!account.inquiry_assistant_enabled && !account.is_admin) {
      return NextResponse.json(
        { ok: false, error: "Kein Zugriff auf den Anfrage-Assistenten." },
        { status: 403 },
      );
    }

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
    const actionStatuses =
      body?.actionStatuses &&
      typeof body.actionStatuses === "object" &&
      !Array.isArray(body.actionStatuses)
        ? (body.actionStatuses as Record<string, string>)
        : undefined;

    const explanationOutputStatuses =
      body?.explanationOutputStatuses &&
      typeof body.explanationOutputStatuses === "object" &&
      !Array.isArray(body.explanationOutputStatuses)
        ? (body.explanationOutputStatuses as Record<string, string>)
        : undefined;

    const communicationReasonSelection =
      body?.communicationReasonSelection &&
      typeof body.communicationReasonSelection === "object" &&
      !Array.isArray(body.communicationReasonSelection)
        ? (body.communicationReasonSelection as Record<string, string>)
        : undefined;

    const responseGoalSelection =
      body?.responseGoalSelection &&
      typeof body.responseGoalSelection === "object" &&
      !Array.isArray(body.responseGoalSelection)
        ? (body.responseGoalSelection as Record<string, string>)
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
