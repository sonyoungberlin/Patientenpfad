import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { requirePracticeRole } from "@/lib/authz";
import {
  updatePracticeDocumentationTemplate,
  PracticeDocumentationTemplateBlockError,
  validatePracticeDocumentationTemplate,
} from "@/lib/practice/documentationTemplates";

const WRITE_ROLES = [PracticeRole.OWNER, PracticeRole.ADMIN];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const input = body && typeof body === "object" && !Array.isArray(body) &&
    (body as Record<string, unknown>).isActive === false
    ? { isActive: false as const }
    : validatePracticeDocumentationTemplate(body);
  if ("ok" in input && !input.ok) {
    return NextResponse.json({ ok: false, error: input.error }, { status: 400 });
  }
  let updated;
  try {
    updated = await updatePracticeDocumentationTemplate(
      practice.id,
      (await params).id,
      "ok" in input ? input.value : input,
    );
  } catch (cause) {
    if (cause instanceof PracticeDocumentationTemplateBlockError) {
      return NextResponse.json({ ok: false, error: cause.message }, { status: 400 });
    }
    throw cause;
  }
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Dokumentationsvorlage nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}