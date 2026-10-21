import { NextRequest, NextResponse } from "next/server";
import {
  hasQuestionnaireKioskCapability,
  requireQuestionnaireKioskAccess,
} from "@/lib/questionnaireKiosk/auth";
import {
  listPracticeDocumentationBlocks,
  toPracticeDocumentationBlockSummary,
} from "@/lib/practice/documentationBlocks";
import { resolveActivePracticeDocumentationTemplates } from "@/lib/practice/documentationTemplates";

export async function GET(req: NextRequest) {
  const { access, error } = await requireQuestionnaireKioskAccess(req, true);
  if (error) return error;
  if (!hasQuestionnaireKioskCapability(access, "internal_documentation")) {
    return NextResponse.json({ ok: false, error: "Interne Dokumentation ist auf diesem Gerät nicht freigeschaltet." }, { status: 403 });
  }
  const [templates, blocks] = await Promise.all([
    resolveActivePracticeDocumentationTemplates(access.practiceId),
    listPracticeDocumentationBlocks(access.practiceId, true),
  ]);
  return NextResponse.json({ ok: true, templates, blocks: blocks.map(toPracticeDocumentationBlockSummary) });
}