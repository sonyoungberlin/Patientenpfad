import { NextRequest, NextResponse } from "next/server";
import { requireInquiriesAccess } from "@/lib/authz";
import {
  saveSessionAsTemplate,
  InquirySessionError,
} from "@/lib/inquiries/inquirySessionService";

/**
 * POST /api/inquiries/[id]/save-as-template
 *
 * Speichert den aktuellen Stand einer bestehenden Arbeits-Session als neue
 * Vorlage (`is_template=true`, `status=DRAFT`). Die Quell-Session bleibt
 * unverändert.
 *
 * Body: { templateName: string }  (Pflicht; trim ≠ "")
 * Response 201: { ok: true, templateId: string, templateName: string }
 *
 * Owner-Guard: Die Quell-Session muss dem aufrufenden Account gehören.
 * Andernfalls antwortet die Route mit 404 (kein 403), um ID-Enumeration zu
 * vermeiden.
 *
 * Hinweis: `templateName` wird in einem dedizierten Feld `template_name`
 * gespeichert – NICHT in `patient_reference` (das bleibt ausschließlich
 * Fragebogenlinks vorbehalten).
 */
export async function POST(
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

    const templateName =
      typeof body?.templateName === "string" ? body.templateName : "";

    const template = await saveSessionAsTemplate(id, account.id, templateName);

    return NextResponse.json(
      {
        ok: true,
        templateId: template.id,
        templateName: template.template_name,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof InquirySessionError) {
      if (err.code === "template_name_required") {
        return NextResponse.json(
          { ok: false, error: err.message },
          { status: 422 },
        );
      }
      if (err.code === "session_not_found") {
        return NextResponse.json(
          { ok: false, error: "Session nicht gefunden." },
          { status: 404 },
        );
      }
    }
    if (err instanceof Error) {
      console.error("[inquiries/[id]/save-as-template]", {
        name: err.name,
        message: err.message,
      });
    } else {
      console.error("[inquiries/[id]/save-as-template]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Vorlage konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
