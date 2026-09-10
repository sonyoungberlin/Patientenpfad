import { NextRequest, NextResponse } from "next/server";
import { requireUnlockedQuestionnaireKioskDevice, hasQuestionnaireKioskCapability } from "@/lib/questionnaireKiosk/auth";
import {
  InternalDocumentationError,
  submitInternalDocumentationSession,
} from "@/lib/questionnaire/internalDocumentationService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { device, error } = await requireUnlockedQuestionnaireKioskDevice(req);
  if (error) return error;
  if (!hasQuestionnaireKioskCapability(device, "internal_documentation")) return NextResponse.json({ ok: false, error: "Interne Dokumentation ist auf diesem Gerät nicht freigeschaltet." }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null) as { answers?: unknown } | null;
  try {
    const exportData = await submitInternalDocumentationSession({
      sessionId: id,
      answers: body?.answers,
      context: {
        kind: "kiosk",
        practiceId: device.practiceId,
        deviceId: device.deviceId,
      },
    });
    return NextResponse.json({ ok: true, ...exportData });
  } catch (cause) {
    if (cause instanceof InternalDocumentationError) {
      const invalidQuestionIds = (cause as InternalDocumentationError & {
        invalidQuestionIds?: string[];
      }).invalidQuestionIds;
      return NextResponse.json(
        { ok: false, error: cause.message, ...(invalidQuestionIds ? { invalidQuestionIds } : {}) },
        { status: cause.status },
      );
    }
    throw cause;
  }
}