import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { requirePracticeRole } from "@/lib/authz";
import {
  createPracticeDocumentationTemplate,
  PracticeDocumentationTemplateBlockError,
  validatePracticeDocumentationTemplate,
} from "@/lib/practice/documentationTemplates";

const WRITE_ROLES = [PracticeRole.OWNER, PracticeRole.ADMIN];

export async function POST(req: NextRequest) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  }
  const validation = validatePracticeDocumentationTemplate(
    await req.json().catch(() => null),
  );
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  try {
    const template = await createPracticeDocumentationTemplate(practice.id, validation.value);
    return NextResponse.json({ ok: true, template }, { status: 201 });
  } catch (cause) {
    if (cause instanceof PracticeDocumentationTemplateBlockError) {
      return NextResponse.json({ ok: false, error: cause.message }, { status: 400 });
    }
    throw cause;
  }
}