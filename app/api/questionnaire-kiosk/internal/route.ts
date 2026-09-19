import { NextRequest, NextResponse } from "next/server";
import { requireUnlockedQuestionnaireKioskDevice, hasQuestionnaireKioskCapability } from "@/lib/questionnaireKiosk/auth";
import {
  createInternalDocumentationSession,
  InternalDocumentationError,
} from "@/lib/questionnaire/internalDocumentationService";

export async function POST(req: NextRequest) {
  const { device, error } = await requireUnlockedQuestionnaireKioskDevice(req);
  if (error) return error;
  if (!hasQuestionnaireKioskCapability(device, "internal_documentation")) return NextResponse.json({ ok: false, error: "Interne Dokumentation ist auf diesem Gerät nicht freigeschaltet." }, { status: 403 });
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
      documentTitleOption: body?.documentTitleOption,
      customDocumentTitle: body?.customDocumentTitle,
      outputFormat: body?.outputFormat,
      origin,
      context: {
        kind: "kiosk" as const,
        practiceId: device.practiceId,
        deviceId: device.deviceId,
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