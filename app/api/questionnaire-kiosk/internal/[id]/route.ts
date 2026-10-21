import { NextRequest, NextResponse } from "next/server";
import {
  hasQuestionnaireKioskCapability,
  requireQuestionnaireKioskAccess,
} from "@/lib/questionnaireKiosk/auth";
import {
  InternalDocumentationError,
  submitInternalDocumentationSession,
} from "@/lib/questionnaire/internalDocumentationService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { access, error } = await requireQuestionnaireKioskAccess(req, true);
  if (error) return error;
  if (!hasQuestionnaireKioskCapability(access, "internal_documentation")) return NextResponse.json({ ok: false, error: "Interne Dokumentation ist für diesen Kiosk-Zugang nicht freigeschaltet." }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null) as { answers?: unknown } | null;
  try {
    const exportData = await submitInternalDocumentationSession({
      sessionId: id,
      answers: body?.answers,
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