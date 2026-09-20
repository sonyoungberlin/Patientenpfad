import { NextRequest, NextResponse } from "next/server";
import { requireInquiriesAccess } from "@/lib/authz";
import {
  getInquirySessionWithOutput,
  instantiateFromTemplate,
  InquirySessionError,
} from "@/lib/inquiries/inquirySessionService";
import { canAccessInquiryTemplate } from "@/lib/inquiries/practiceScope";

/**
 * POST /api/inquiries/templates/[id]/instantiate
 *
 * Erzeugt aus einer Vorlage eine neue, normale Arbeits-Session
 * (is_template=false, status=DRAFT). Die Vorlage selbst bleibt unverändert
 * und ist weiterhin in der Übersicht sichtbar.
 *
 * Response 201: { ok: true, inquiryId: string }
 *
 * Practice-Guard: Die Vorlage muss zur aktuellen Praxis gehören. Der
 * Ersteller-Account ist für die Verwendung unerheblich. Fremde Practices
 * erhalten 404, um ID-Enumeration zu vermeiden.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireInquiriesAccess(req);
    if (error) return error;

    const { id } = await params;

    const template = await getInquirySessionWithOutput(id, undefined, undefined, {
      includeTemplates: true,
    });
    if (!template || !canAccessInquiryTemplate(account, template)) {
      return NextResponse.json(
        { ok: false, error: "Vorlage nicht gefunden." },
        { status: 404 },
      );
    }

    const session = await instantiateFromTemplate(
      id,
      account.id,
      account.current_practice!.id,
    );

    return NextResponse.json(
      { ok: true, inquiryId: session.id },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof InquirySessionError && err.code === "session_not_found") {
      return NextResponse.json(
        { ok: false, error: "Vorlage nicht gefunden." },
        { status: 404 },
      );
    }
    if (err instanceof Error) {
      console.error("[inquiries/templates/[id]/instantiate]", {
        name: err.name,
        message: err.message,
      });
    } else {
      console.error("[inquiries/templates/[id]/instantiate]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Vorlage konnte nicht verwendet werden." },
      { status: 500 },
    );
  }
}
