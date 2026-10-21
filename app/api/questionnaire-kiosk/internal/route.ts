import { NextRequest, NextResponse } from "next/server";
import {
  hasQuestionnaireKioskCapability,
  requireQuestionnaireKioskAccess,
} from "@/lib/questionnaireKiosk/auth";
import {
  createInternalDocumentationSession,
  InternalDocumentationError,
} from "@/lib/questionnaire/internalDocumentationService";

export async function POST(req: NextRequest) {
  const { access, error } = await requireQuestionnaireKioskAccess(req, true);
  if (error) return error;
  if (!hasQuestionnaireKioskCapability(access, "internal_documentation")) return NextResponse.json({ ok: false, error: "Interne Dokumentation ist für diesen Kiosk-Zugang nicht freigeschaltet." }, { status: 403 });
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
      blockLayout: body?.blockLayout,
      patientReference: typeof patientReference === "string" ? patientReference.trim() : patientReference,
      documentKind: body?.documentKind,
      documentTitleOption: body?.documentTitleOption,
      customDocumentTitle: body?.customDocumentTitle,
      outputFormat: body?.outputFormat,
      origin,
      context: access.kind === "device"
        ? {
            kind: "kiosk" as const,
            practiceId: access.practiceId,
            deviceId: access.deviceId,
          }
        : {
            kind: "kiosk_account" as const,
            practiceId: access.practiceId,
            accountId: access.accountId,
          },
    };
    const result = await createInternalDocumentationSession(createInput);
    return NextResponse.json({
      ok: true,
      sessionId: result.sessionId,
      link: `${origin}/questionnaire-kiosk/internal/${result.sessionId}`,
    });
  } catch (cause) {
    if (cause instanceof InternalDocumentationError) {
      return NextResponse.json({ ok: false, error: cause.message }, { status: cause.status });
    }
    throw cause;
  }
}