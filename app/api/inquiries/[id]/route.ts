import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import {
  getInquirySessionWithOutput,
  deleteInquirySession,
  InquirySessionError,
} from "@/lib/inquiries/inquirySessionService";

/**
 * GET /api/inquiries/[id]
 *
 * Liest eine InquirySession inkl. generiertem Output.
 *
 * Response 200: { ok: true, session: { id, status, selectedInquiryIds, generatedOutput, confirmedAt } }
 */
export async function GET(
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

    const session = await getInquirySessionWithOutput(id, account.id);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      session: {
        id: session.id,
        status: session.status,
        selectedInquiryIds: session.selected_inquiry_ids,
        checkpointStatuses: session.checkpoint_statuses,
        actionStatuses: session.action_statuses,
        generatedOutput: session.generated_output,
        confirmedAt: session.confirmed_at,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[inquiries/[id]]", { name: err.name, message: err.message });
    } else {
      console.error("[inquiries/[id]]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Session konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/inquiries/[id]
 *
 * Löscht eine InquirySession vollständig.
 *
 * Response 200: { ok: true }
 */
export async function DELETE(
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

    await deleteInquirySession(id, account.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InquirySessionError && err.code === "session_not_found") {
      return NextResponse.json(
        { ok: false, error: "Session nicht gefunden." },
        { status: 404 },
      );
    }
    if (err instanceof Error) {
      console.error("[DELETE inquiries/[id]]", { name: err.name, message: err.message });
    } else {
      console.error("[DELETE inquiries/[id]]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Session konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
