import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { requirePracticeRole } from "@/lib/authz";
import { buildPrintPdf } from "@/lib/pdf/printPdf";
import {
  listPracticeDocumentationBlocks,
  parsePracticeDocumentationBlockDefinition,
} from "@/lib/practice/documentationBlocks";
import { buildDocumentationLibraryPrintBlocks } from "@/lib/practice/documentationLibraryPrintPdf";
import { listPracticeDocumentationTemplates } from "@/lib/practice/documentationTemplates";

export async function GET(req: NextRequest) {
  const auth = await requirePracticeRole(req, [PracticeRole.OWNER, PracticeRole.ADMIN]);
  if (auth.error) return auth.error;
  if (!auth.account.is_approved) {
    return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
  }

  const practiceId = auth.account.current_practice?.id;
  if (!practiceId) {
    return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  }

  const [allBlocks, allTemplates] = await Promise.all([
    listPracticeDocumentationBlocks(practiceId),
    listPracticeDocumentationTemplates(practiceId),
  ]);
  const blocks = allBlocks.map((block) => ({
    id: block.id,
    title: block.title,
    isActive: block.is_active,
    definition: parsePracticeDocumentationBlockDefinition(block.definition),
  }));
  const templates = allTemplates
    .filter((template) => template.is_active)
    .map((template) => ({
      name: template.name,
      category: template.category,
      block_layout: template.block_layout,
      outputFormat: template.output_format,
      documentTitleOption: template.document_title_option,
      patientSignatureRequired: template.patient_signature_required,
    }));
  const bytes = await buildPrintPdf(
    "Dokumentationsbibliothek",
    buildDocumentationLibraryPrintBlocks(blocks, templates),
  );

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="dokumentationsbibliothek.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}