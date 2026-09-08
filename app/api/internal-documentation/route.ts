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
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const protocol = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : req.nextUrl.origin;

  try {
    const result = await createInternalDocumentationSession({
      workflowId: body?.workflow_id,
      patientReference: body?.patient_reference,
      origin,
      context: {
        kind: "practice",
        practiceId: practice.id,
        accountId: account.id,
      },
    });
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