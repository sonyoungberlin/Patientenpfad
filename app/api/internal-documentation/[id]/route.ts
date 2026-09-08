import { NextRequest, NextResponse } from "next/server";
import { requireInternalDocumentationAccess } from "@/lib/authz";
import {
  InternalDocumentationError,
  submitInternalDocumentationSession,
} from "@/lib/questionnaire/internalDocumentationService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireInternalDocumentationAccess(req);
  if (error) return error;
  const practice = account.current_practice;
  if (!practice) {
    return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null) as { answers?: unknown } | null;
  try {
    await submitInternalDocumentationSession({
      sessionId: id,
      answers: body?.answers,
      context: {
        kind: "practice",
        practiceId: practice.id,
        accountId: account.id,
      },
    });
    return NextResponse.json({ ok: true });
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