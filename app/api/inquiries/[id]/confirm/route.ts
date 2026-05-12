import { NextRequest, NextResponse } from "next/server";
import { requireInquiriesAccess } from "@/lib/authz";
import {
  getInquirySessionWithOutput,
  confirmInquirySession,
  InquirySessionError,
} from "@/lib/inquiries/inquirySessionService";

/**
 * POST /api/inquiries/[id]/confirm
 *
 * Bestätigt eine InquirySession (DRAFT → CONFIRMED).
 * Berechnet generated_output deterministisch und setzt confirmed_at.
 * Idempotent: Ist die Session bereits CONFIRMED, wird { ok: true, already_confirmed: true } zurückgegeben.
 *
 * Response 200: { ok: true, output: InquiryResponseV2Output }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireInquiriesAccess(req);
    if (error) return error;

    const { id } = await params;

    // Ownership prüfen: Session muss dem anfragenden Account gehören.
    const existing = await getInquirySessionWithOutput(id, account.id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Session nicht gefunden." },
        { status: 404 },
      );
    }

    const session = await confirmInquirySession(id);

    const alreadyConfirmed = existing.status === "CONFIRMED";
    return NextResponse.json({
      ok: true,
      ...(alreadyConfirmed ? { already_confirmed: true } : {}),
      output: session.generated_output,
    });
  } catch (err) {
    if (err instanceof InquirySessionError) {
      if (err.code === "session_not_found") {
        return NextResponse.json(
          { ok: false, error: err.message },
          { status: 404 },
        );
      }
    }
    if (err instanceof Error) {
      console.error("[inquiries/[id]/confirm]", { name: err.name, message: err.message });
    } else {
      console.error("[inquiries/[id]/confirm]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Die Session konnte nicht bestätigt werden." },
      { status: 500 },
    );
  }
}
