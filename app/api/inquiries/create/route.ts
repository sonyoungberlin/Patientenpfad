import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import {
  createInquirySession,
  InquirySessionError,
} from "@/lib/inquiries/inquirySessionService";

/**
 * POST /api/inquiries/create
 *
 * Legt eine neue InquirySession im Status DRAFT an.
 *
 * Body: { inquiryIds: string[] }
 * Response 201: { ok: true, inquiryId: string }
 */
export async function POST(req: NextRequest) {
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

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Ungültiger JSON-Body." },
        { status: 400 },
      );
    }

    const inquiryIds = Array.isArray(body?.inquiryIds)
      ? (body.inquiryIds as unknown[]).filter(
          (id): id is string => typeof id === "string",
        )
      : [];

    const asTemplate = body?.asTemplate === true;
    const templateNameRaw =
      typeof body?.templateName === "string" ? body.templateName : undefined;

    const session = await createInquirySession({
      selectedInquiryIds: inquiryIds,
      ownerAccountId: account.id,
      asTemplate,
      templateName: templateNameRaw,
    });

    return NextResponse.json(
      {
        ok: true,
        inquiryId: session.id,
        isTemplate: session.is_template,
        templateName: session.template_name,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof InquirySessionError && err.code === "invalid_inquiry_ids") {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 422 },
      );
    }
    if (
      err instanceof InquirySessionError &&
      err.code === "template_name_required"
    ) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 422 },
      );
    }
    if (err instanceof Error) {
      console.error("[inquiries/create]", { name: err.name, message: err.message });
    } else {
      console.error("[inquiries/create]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Die Session konnte nicht angelegt werden." },
      { status: 500 },
    );
  }
}
