import { NextRequest, NextResponse } from "next/server";
import { requireInternalDocumentationAccess } from "@/lib/authz";
import {
  createInternalDocumentationSession,
  InternalDocumentationError,
} from "@/lib/questionnaire/internalDocumentationService";

export async function POST(req: NextRequest) {
  const { account, error } = await requireInternalDocumentationAccess(req);
  if (error) return error;
  const practice = account.current_practice;
  if (!practice) {
    return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (body && (Object.prototype.hasOwnProperty.call(body, "workflow_id") || Object.prototype.hasOwnProperty.call(body, "patient_reference"))) {
    return NextResponse.json({ ok: false, error: "Legacy-Create-Felder werden nicht mehr unterstützt." }, { status: 400 });
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const protocol = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : req.nextUrl.origin;

  try {
    const patientReference = body?.patientReference;
    const createInput = {
      selectedBlockIds: body?.selectedBlockIds,
      patientReference: typeof patientReference === "string" ? patientReference.trim() : patientReference,
      origin,
      context: {
        kind: "practice" as const,
        practiceId: practice.id,
        accountId: account.id,
      },
    };
    const result = await createInternalDocumentationSession(createInput);
    return NextResponse.json({
      ok: true,
      sessionId: result.sessionId,
      link: `${origin}/cases/internal-documentation/${result.sessionId}`,
    });
  } catch (cause) {
    if (cause instanceof InternalDocumentationError) {
      return NextResponse.json({ ok: false, error: cause.message }, { status: cause.status });
    }
    throw cause;
  }
}