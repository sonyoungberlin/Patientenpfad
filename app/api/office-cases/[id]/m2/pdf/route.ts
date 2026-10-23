import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeCasesManagementAccess } from "@/lib/authz";
import { getOfficeTopic, isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { ownsOfficeCase } from "@/lib/office/scope";
import {
  buildOfficeM2PrintPdf,
  buildOfficeM2PrintSections,
} from "@/lib/office/m2PrintPdf";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireOfficeCasesManagementAccess(req);
  if (error) return error;

  const { id } = await params;
  const officeCase = await prisma.officeCaseSession.findUnique({
    where: { id },
    select: {
      title: true,
      owner_account_id: true,
      owner_practice_id: true,
      checkpoint_snapshot: true,
    },
  });

  if (!officeCase || !ownsOfficeCase(account, officeCase)) {
    return NextResponse.json({ ok: false, error: "Nicht gefunden." }, { status: 404 });
  }

  const snapshot = isRecord(officeCase.checkpoint_snapshot)
    ? officeCase.checkpoint_snapshot
    : null;
  const topicId = typeof snapshot?.topicId === "string" && isOfficeTopicId(snapshot.topicId)
    ? snapshot.topicId
    : null;
  if (!snapshot || !topicId) {
    return NextResponse.json({ ok: false, error: "Ungültiger Office-Fall." }, { status: 422 });
  }

  const topicTitle = typeof snapshot.topicTitle === "string"
    ? snapshot.topicTitle
    : getOfficeTopic(topicId).title;
  const caseTitle = officeCase.title ?? topicTitle;
  const sections = buildOfficeM2PrintSections(
    topicId,
    snapshot.templateVersion,
    snapshot.checkpoints,
  );
  const bytes = await buildOfficeM2PrintPdf({
    caseTitle,
    topicTitle,
    sections,
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="M2-Druckversion.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}